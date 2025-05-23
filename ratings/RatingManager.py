# ratings/RatingManager.py

import datetime
import sqlite3
import json
import os

from utils.content_helpers import parse_content_id

class RatingManager:
    """
    A rating manager that loads/saves rating data as dictionaries.
    """

    def __init__(self, db_path="./data/ratings.db"):
        # Connect to database
        self.db_path = db_path
        init_needed = True #not os.path.exists(db_path)
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
                categories TEXT,
                title TEXT,
                poster_url TEXT,
                backdrop_url TEXT
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
        # Create 'category_presets' table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS category_presets (
                preset_name TEXT PRIMARY KEY,
                date_created TEXT NOT NULL,
                date_modified TEXT NOT NULL
            );
        """)
        # Create 'category_preset_items' table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS category_preset_items (
                preset_name INTEGER NOT NULL,
                cat_label TEXT NOT NULL,
                cat_weight REAL NOT NULL DEFAULT 1,
                cat_order INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (preset_name, cat_label),
                FOREIGN KEY(preset_name) REFERENCES category_presets(preset_name) ON DELETE CASCADE
            );
        """)
        self.conn.commit()
    
    def close(self):
        self.conn.close()
    
    def save_category_preset(self, preset_name, categories):
        """
        Create or update the preset with 'preset_name' 
        so that it has exactly the categories provided in 'categories'.
        categories: list of (cat_label, cat_weight)
        
        Return the preset_name of the inserted/updated row.
        """
        now_str = datetime.datetime.now().isoformat()
        cur = self.conn.cursor()

        # Check if preset already exists
        cur.execute("""
            SELECT preset_name FROM category_presets WHERE preset_name = ?
        """, (preset_name,))
        row = cur.fetchone()

        if row is None:
            # This is a new preset -> insert
            cur.execute("""
                INSERT INTO category_presets (preset_name, date_created, date_modified)
                VALUES (?, ?, ?)
            """, (preset_name, now_str, now_str))
        else:
            # Existing preset -> update
            # Update date_modified
            cur.execute("""
                UPDATE category_presets
                SET date_modified=?
                WHERE preset_name=?
            """, (now_str, preset_name))
            # Remove old items
            cur.execute("""
                DELETE FROM category_preset_items
                WHERE preset_name=?
            """, (preset_name,))

        # (In either case) Insert the new items
        for index, (cat_label, cat_weight) in enumerate(categories):
            cur.execute("""
                INSERT INTO category_preset_items (preset_name, cat_label, cat_weight, cat_order)
                VALUES (?, ?, ?, ?)
            """, (preset_name, cat_label, cat_weight, index))

        self.conn.commit()
        return preset_name
    
    def get_category_preset_by_name(self, preset_name):
        """
        Return a dict like:
          {
            "preset_name": ...,
            "categories": [
               { "label": cat_label, "weight": 1.0, "order": cat_order },
               ...
            ]
          }
        or None if not found.
        """
        cur = self.conn.cursor()
        # Find the preset_name
        cur.execute("""
            SELECT preset_name, date_created, date_modified
            FROM category_presets
            WHERE preset_name = ?
        """, (preset_name,))
        row = cur.fetchone()
        if not row:
            return None
        
        # Load the items
        cur.execute("""
            SELECT cat_label, cat_weight, cat_order
            FROM category_preset_items
            WHERE preset_name = ?
            ORDER BY cat_order
        """, (preset_name,))
        items_rows = cur.fetchall()

        categories = []
        for r in items_rows:
            categories.append({
                "label": r["cat_label"],
                "weight": r["cat_weight"],
                "order": r["cat_order"],
            })

        return {
            "preset_name": preset_name,
            "categories": categories
        }
    
    def list_category_presets(self):
        """
        Return a list of preset_name for all known presets.
        """
        cur = self.conn.cursor()
        cur.execute("""
            SELECT preset_name
            FROM category_presets
            ORDER BY preset_name
        """)
        rows = cur.fetchall()
        return [(r["preset_name"]) for r in rows]
    
    def delete_category_preset(self, preset_name):
        """
        Remove a preset by ID, also cascades to category_preset_items.
        """
        cur = self.conn.cursor()
        cur.execute("DELETE FROM category_presets WHERE preset_name = ?", (preset_name,))
        self.conn.commit()

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
        # Handle case where categories were empty and will therefore load as None
        else:
            data["categories"] = {}
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
            INSERT INTO ratings (
                content_id, 
                preferred_strategy, 
                one_score, 
                category_aggregate, 
                aggregate_rating, 
                categories, 
                title,
                poster_url,
                backdrop_url
            )
            VALUES (
                :content_id, 
                :preferred_strategy, 
                :one_score, 
                :category_aggregate, 
                :aggregate_rating, 
                :categories, 
                :title,
                :poster_url,
                :backdrop_url
            )
            ON CONFLICT(content_id) DO UPDATE SET
                preferred_strategy=excluded.preferred_strategy,
                one_score=excluded.one_score,
                category_aggregate=excluded.category_aggregate,
                aggregate_rating=excluded.aggregate_rating,
                categories=excluded.categories,
                title=excluded.title,
                poster_url=COALESCE(excluded.poster_url, poster_url),
                backdrop_url=COALESCE(excluded.backdrop_url, backdrop_url)
        """, {
            "content_id": data_dict.get("content_id"),
            "preferred_strategy": data_dict.get("preferred_strategy"),
            "one_score": data_dict.get("one_score"),
            "category_aggregate": data_dict.get("category_aggregate"),
            "aggregate_rating": data_dict.get("aggregate_rating"),
            "categories": categories_text,
            "title": data_dict.get("title"),
            "poster_url": data_dict.get("poster_url"),
            "backdrop_url": data_dict.get("backdrop_url")
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
        if parsed["type"] != "tv":
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
            if parsed["type"] != "tv":
                # print("Not a tv-based content, skipping parent chain.")
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
        if parsed["type"] != "tv":
            # print("Not a tv-based content, skipping recompute.")
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
            SELECT preferred_strategy, one_score, category_aggregate, aggregate_rating, poster_url, backdrop_url
            FROM ratings
            WHERE content_id LIKE ?
        """, (like_pattern,))
        rows = cur.fetchall()

        ratings = []
        # Try to get image URLs from one of the children if available
        sample_poster_url = None
        sample_backdrop_url = None
        
        for row in rows:
            # Pick the preferred numeric rating value for each child
            val = self._pick_preferred_value(row["preferred_strategy"],
                                             row["one_score"],
                                             row["category_aggregate"],
                                             row["aggregate_rating"])
            # Only append if there is a valid numeric rating
            if val is not None:
                ratings.append(val)
            
            # Get the first non-empty image URLs we find
            if not sample_poster_url and row["poster_url"]:
                sample_poster_url = row["poster_url"]
            if not sample_backdrop_url and row["backdrop_url"]:
                sample_backdrop_url = row["backdrop_url"]
            
        # Compute the aggregate value
        agg_val = round(sum(ratings)/len(ratings), 3) if ratings else None

        # Check if the parent record already exists
        cur.execute("SELECT content_id, title, poster_url, backdrop_url FROM ratings WHERE content_id = ?", (parent_id,))
        parent_row = cur.fetchone()
        
        if parent_row is None:
            # Parent doesn't exist - create a new entry with proper fields
            # First, try to get a proper title from the API
            title = self._generate_title_from_content_id(parent_id)
            
            # Insert a complete new record
            cur.execute("""
                INSERT INTO ratings (
                    content_id, 
                    preferred_strategy, 
                    one_score, 
                    category_aggregate, 
                    aggregate_rating,
                    categories,
                    title,
                    poster_url,
                    backdrop_url
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                parent_id, 
                "aggregate_rating",  # Default to aggregate as preferred strategy
                None,                # No direct score
                None,                # No category aggregate
                agg_val,             # The calculated aggregate value
                None,                # No categories
                title,               # The generated title
                sample_poster_url,   # Poster URL from a child if available
                sample_backdrop_url  # Backdrop URL from a child if available
            ))
        else:
            # Parent exists - update the aggregate_rating and image URLs if needed
            update_fields = ["aggregate_rating = ?", 
                            "preferred_strategy = COALESCE(preferred_strategy, 'aggregate_rating')"]
            params = [agg_val]
            
            # Only update poster URL if parent doesn't already have one
            if not parent_row["poster_url"] and sample_poster_url:
                update_fields.append("poster_url = ?")
                params.append(sample_poster_url)
                
            # Only update backdrop URL if parent doesn't already have one
            if not parent_row["backdrop_url"] and sample_backdrop_url:
                update_fields.append("backdrop_url = ?")
                params.append(sample_backdrop_url)
                
            # Add the content_id as the final parameter
            params.append(parent_id)
            
            # Build and execute the query
            update_query = f"""
                UPDATE ratings
                SET {', '.join(update_fields)}
                WHERE content_id = ?
            """
            cur.execute(update_query, params)
            
            # If it doesn't have a title, try to set one
            if not parent_row["title"]:
                title = self._generate_title_from_content_id(parent_id)
                if title:
                    cur.execute("""
                        UPDATE ratings
                        SET title = ?
                        WHERE content_id = ?
                    """, (title, parent_id))
        
        self.conn.commit()
        
    def _generate_title_from_content_id(self, content_id):
        """
        Generate a meaningful title from a content_id when one isn't available.
        This is used when automatically creating parent ratings.
        """
        try:
            # Import here to avoid circular import problems
            from utils.content_helpers import parse_content_id
            
            parsed = parse_content_id(content_id)
            
            # Default title as a fallback
            default_title = content_id.replace("tv:", "").replace("movie:", "")
            
            if parsed["type"] == "tv":
                show_id = parsed["show_id"]
                season_num = parsed["season_number"]
                
                # It's a TV show
                if season_num is None:
                    # Just the show - try to find an episode or child that's already rated
                    # and check if it has show info in its title
                    cur = self.conn.cursor()
                    cur.execute("""
                        SELECT title FROM ratings 
                        WHERE content_id LIKE ? 
                        AND title IS NOT NULL LIMIT 1
                    """, (f"tv:{show_id}-%",))
                    child_row = cur.fetchone()
                    
                    if child_row and child_row["title"]:
                        # Try to extract show name from child title
                        # E.g. "Doctor Who S1E1: An Unearthly Child" -> "Doctor Who"
                        title = child_row["title"]
                        if "S" in title and "E" in title and ":" in title:
                            show_name = title.split("S")[0].strip()
                            return show_name
                    
                    # If no child with title found, just use a generic title
                    return f"TV Show {show_id}"
                    
                # It's a season
                elif season_num is not None and parsed["episode_number"] is None:
                    # First check if any episodes in this season have titles
                    cur = self.conn.cursor()
                    cur.execute("""
                        SELECT title FROM ratings 
                        WHERE content_id LIKE ? 
                        AND title IS NOT NULL LIMIT 1
                    """, (f"tv:{show_id}-S{season_num}-E%",))
                    episode_row = cur.fetchone()
                    
                    if episode_row and episode_row["title"]:
                        # Try to extract show name from episode title
                        title = episode_row["title"]
                        if "S" in title and "E" in title and ":" in title:
                            show_name = title.split("S")[0].strip()
                            return f"{show_name}Season {season_num}"
                    
                    # If no episode with title found, use a generic title
                    return f"Season {season_num}"
            
            # If we couldn't generate a title, return the default
            return default_title
            
        except Exception as e:
            print(f"Error generating title: {e}")
            return None
    
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
            
    def get_all_ratings(self, content_type=None):
        """
        Get all ratings, optionally filtered by content_type ('movie' or 'tv').
        Returns list of dicts with rating data.
        """
        cur = self.conn.cursor()
        
        query = """
            SELECT * FROM ratings
            WHERE content_id NOT LIKE 'set:%'
        """
        params = []
        
        if content_type:
            query += " AND content_id LIKE ?"
            params.append(f"{content_type}:%")
            
        query += " ORDER BY content_id"
        
        cur.execute(query, params)
        rows = cur.fetchall()
        
        results = []
        for row in rows:
            data = dict(row)
            # Deserialize categories
            if data["categories"]:
                data["categories"] = json.loads(data["categories"])
            else:
                data["categories"] = {}
                
            # Calculate the effective rating based on preferred strategy
            data["effective_rating"] = self._pick_preferred_value(
                data["preferred_strategy"],
                data["one_score"],
                data["category_aggregate"],
                data["aggregate_rating"]
            )
            
            results.append(data)
            
        return results