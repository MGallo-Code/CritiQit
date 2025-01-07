# ratings/RatingManager.py

import numpy as np
import sqlite3
import json
import os

from utils.APIManager import parse_content_id

class RatingManager:
    """
    A rating manager that loads/saves rating data as dictionaries.
    """

    def __init__(self, db_path="./data/ratings.db"):
        # Connect to database
        self.db_path = db_path
        init_needed = not os.path.exists(db_path)
        self.conn = sqlite3.connect(db_path)
        # Allow foreign keys
        self.conn.execute("PRAGMA foreign_keys = ON;")
        # Allow accessing cols by name
        self.conn.row_factory = sqlite3.Row

        # If the database is new, create the tables
        if init_needed:
            self._init_db()
    
    def _init_db(self):
        cur = self.conn.cursor()
        # Create 'ratings' table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS ratings (
                content_id TEXT PRIMARY KEY,
                preferred_strategy TEXT,
                one_score REAL,
                category_aggregate REAL,
                aggregate_rating REAL,
                categories TEXT
            );
        """)
        # Create 'set' table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sets (
                set_id INTEGER PRIMARY KEY AUTOINCREMENT,
                set_name TEXT NOT NULL,
                date_created TEXT NOT NULL,
                date_last_updated TEXT NOT NULL
            );
        """)
        # Create 'set_membership' table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS set_membership (
                set_id INTEGER NOT NULL,
                content_id TEXT NOT NULL,
                date_added TEXT NOT NULL,
                order_num INTEGER,
                PRIMARY KEY (set_id, content_id),
                FOREIGN KEY (set_id) REFERENCES sets(set_id) ON DELETE CASCADE,
                FOREIGN KEY (content_id) REFERENCES ratings(content_id) ON DELETE CASCADE
            );
        """)
        self.conn.commit()
    
    def close(self):
        self.conn.close()

    def get_rating_data(self, content_id):
        # Select the row with the given content_id
        cur = self.conn.cursor()
        cur.execute("SELECT * FROM ratings WHERE content_id=?", (content_id,))
        row = cur.fetchone()
        # If doesn't exist, return None
        if not row:
            return None
        # Convert row to dict
        data = dict(row)
        # Deserialize categories
        if data["categories"]:
            data["categories"] = json.loads(data["categories"])
        return data
    
    def get_all_ratings_for_pattern(self, like_pattern):
        """
        Return a dict of content_id: numeric_rating for all ratings matching the pattern,
        where numeric_rating is the 'preferred' numeric rating or None if not rated.
        """
        # The episodes for a season have content_id like "tv:{show_id}-S{season_num}-E%"
        cur = self.conn.cursor()
        cur.execute("""
            SELECT content_id, preferred_strategy, one_score, category_aggregate, aggregate_rating
            FROM ratings
            WHERE content_id LIKE ?
        """, (like_pattern,))
        rows = cur.fetchall()

        results = {}
        for row in rows:
            numeric_val = self._pick_preferred_value(
                row["preferred_strategy"],
                row["one_score"],
                row["category_aggregate"],
                row["aggregate_rating"]
            )
            results[row["content_id"]] = numeric_val
        return results
    
    def save_rating_data(self, data_dict):
        # Serialize categories
        categories_text = None
        if "categories" in data_dict and data_dict["categories"]:
            categories_text = json.dumps(data_dict["categories"])

        # Insert or update the row
        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO ratings (content_id, preferred_strategy, one_score, category_aggregate, aggregate_rating, categories)
            VALUES (:content_id, :preferred_strategy, :one_score, :category_aggregate, :aggregate_rating, :categories)
            ON CONFLICT(content_id) DO UPDATE SET
                preferred_strategy=excluded.preferred_strategy,
                one_score=excluded.one_score,
                category_aggregate=excluded.category_aggregate,
                aggregate_rating=excluded.aggregate_rating,
                categories=excluded.categories
        """, {
            "content_id": data_dict.get("content_id"),
            "preferred_strategy": data_dict.get("preferred_strategy"),
            "one_score": data_dict.get("one_score"),
            "category_aggregate": data_dict.get("category_aggregate"),
            "aggregate_rating": data_dict.get("aggregate_rating"),
            "categories": categories_text
        })
        self.conn.commit()

        # Now that row is inserted/updated, do aggregator logic
        self.on_rating_updated(data_dict["content_id"])
        
    def delete_rating_data(self, content_id):
        # Delete the row with the given content_id
        cur = self.conn.cursor()
        cur.execute("DELETE FROM ratings WHERE content_id=?", (content_id,))
        self.conn.commit()

        # Now that row is deleted, do aggregator logic
        self.on_rating_updated(content_id)
    
    def on_rating_updated(self, content_id):
        """
        1) Get the entire chain: [content_id, parent1, parent2, ...] up to top
        2) For each item in that chain, recompute aggregator (if it's a "tv" type).
        3) For each item, find sets that contain it and update them.
        """
        chain_ids = []
        parsed = parse_content_id(content_id)
        # If not tv-based, no parent
        if parsed["content_type"] != "tv":
            chain_ids = [content_id]
        else:
            chain_ids = self._get_parent_chain(content_id)
        for cid in chain_ids:
            # If cid is tv-based, we can recompute its aggregator
            self._recompute_parent_aggregate(cid)
            # Then update any sets that contain cid
            self._update_sets_for_item(cid)

    def add_item_to_set(self, set_id, content_id):
        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO set_membership (set_id, content_id, date_added)
            VALUES (?, ?, datetime('now'))
        """, (set_id, content_id))
        self.conn.commit()
        # Recompute aggregator for that set
        self.recompute_set_aggregate(set_id)
    
    def remove_item_from_set(self, set_id, content_id):
        cur = self.conn.cursor()
        cur.execute("""
            DELETE FROM set_membership WHERE set_id=? AND content_id=?
        """, (set_id, content_id))
        self.conn.commit()
        # Recompute aggregator for that set
        self.recompute_set_aggregate(set_id)

    def recompute_set_aggregate(self, set_id):
        # Query all items in the set
        cur = self.conn.cursor()
        cur.execute("""
            SELECT r.preferred_strategy, r.one_score, r.category_aggregate, r.aggregate_rating
            FROM ratings r
            JOIN set_membership s ON r.content_id = s.content_id
            WHERE s.set_id = ?
        """, (set_id,))
        rows = cur.fetchall()
        # For each row, figure out the actual numeric rating
        ratings = []
        for row in rows:
            rating_val = self._pick_preferred_value(row["preferred_strategy"], row["one_score"], row["category_aggregate"], row["aggregate_rating"])
            if rating_val is not None:
                ratings.append(rating_val)
        agg_val = round(sum(ratings)/len(ratings), 3) if ratings else None

        # Now store that aggregator in the "ratings" table for set_id
        cur.execute("""
            INSERT INTO ratings (content_id, aggregate_rating)
            VALUES (?, ?)
            ON CONFLICT(content_id) DO UPDATE SET
                aggregate_rating=excluded.aggregate_rating
        """, (set_id, agg_val))
        self.conn.commit()

    def _pick_preferred_value(self, pref, one_score, cat_agg, agg):
        # Used in calculating aggregate values for a set
        if not pref:
            # fallback order: one_score -> cat_agg -> agg
            return one_score if one_score is not None else cat_agg if cat_agg is not None else agg
        elif pref == "one_score":
            return one_score
        elif pref == "category_aggregate":
            return cat_agg
        elif pref == "aggregate_rating":
            return agg
        return None
    
    def _get_parent_chain(self, content_id):
        """
        ASSUMES content_id of type "tv"
        Return [content_id, parent_id, grandparent_id, ...] until no more parents exist.
        E.g. "tv:12345-S2-E4" -> ["tv:12345-S2-E4", "tv:12345-S2", "tv:12345"]
        """
        chain = []
        current = content_id

        while current:
            chain.append(current)
            parsed = parse_content_id(current)
            if parsed["content_type"] != "tv":
                print("Not a tv-based content, skipping parent chain.")
                return

            # If it's an episode, parent is the season
            if parsed["episode_number"] is not None:
                current = f"tv:{parsed['show_id']}-S{parsed['season_number']}"
            # If it's a season, parent is the show
            elif parsed["season_number"] is not None:
                current = f"tv:{parsed['show_id']}"
            # If it's a show, no more parent
            else:
                current = None
        
        return chain
    
    def _recompute_parent_aggregate(self, content_id):
        """
        ASSUMES content_id of type "tv"
        If content_id is e.g. "tv:12345-S2", gather all rated episodes "tv:12345-S2-E..."
        If it's "tv:12345", gather all seasons or episodes.
        Then compute the aggregator and update the rating row.
        If it's not tv-based, do nothing.
        """
        parsed = parse_content_id(content_id)
        if parsed["content_type"] != "tv":
            print("Not a tv-based content, skipping recompute.")
            return

        # If it's a season, gather all episodes
        if parsed["season_number"] is not None and parsed["episode_number"] is None:
            # gather all episodes,
            pattern = content_id + "-E%"
            self._compute_agg_from_children(content_id, pattern)
        # If it's a show, gather all seasons
        elif parsed["season_number"] is None and parsed["episode_number"] is None:
            # gather all seasons,
            pattern = content_id + "-S%"
            self._compute_agg_from_children(content_id, pattern)
        # It's an episode, not a parent to recompute
        else:
            return
    
    def _compute_agg_from_children(self, parent_id, like_pattern):
        """
        Perform aggregator logic for 'parent_id' by averaging children
        that match 'like_pattern' in their content_id.
        """
        # e.g. like_pattern = "tv:12345-S2-E%"
        cur = self.conn.cursor()
        cur.execute("""
            SELECT preferred_strategy, one_score, category_aggregate, aggregate_rating
            FROM ratings
            WHERE content_id LIKE ?
        """, (like_pattern,))
        rows = cur.fetchall()

        ratings = []
        for row in rows:
            # Pick the preferred numeric rating value for each child
            val = self._pick_preferred_value(row["preferred_strategy"],
                                             row["one_score"],
                                             row["category_aggregate"],
                                             row["aggregate_rating"])
            # Only append if there is a valid numeric rating
            if val is not None:
                ratings.append(val)
            
        # Compute the aggregate value
        agg_val = round(sum(ratings)/len(ratings), 3) if ratings else None

        # Update the parent's aggregator
        cur.execute("""
            INSERT INTO ratings (content_id, aggregate_rating)
            VALUES (?, ?)
            ON CONFLICT(content_id) DO UPDATE SET
                aggregate_rating=excluded.aggregate_rating
        """, (parent_id, agg_val))
        self.conn.commit()
    
    def _update_sets_for_item(self, content_id):
        """
        Find all sets containing content_id, recompute aggregator for each.
        """
        cur = self.conn.cursor()
        cur.execute("""
            SELECT set_id FROM set_membership WHERE content_id=?
        """, (content_id,))
        rows = cur.fetchall()
        for row in rows:
            self.recompute_set_aggregate(row["set_id"])