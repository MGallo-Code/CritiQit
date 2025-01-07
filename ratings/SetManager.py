# ratings/SetManager.py

import numpy as np

from utils.APIManager import parse_content_id
from ratings.MixedRatingStrategy import MixedRatingStrategy

class SetManager:
    def __init__(self, rating_manager, hierarchy_sets_file_path="./data/hierarchy_sets.npy", custom_sets_file_path="./data/custom_sets.npy"):
        """
        rating_manager: The same RatingManager you use to store ratings.
        """
        self.rating_manager = rating_manager

        # 1) Hierarchical sets dictionary (Parent-child relationships).
        # Example:
        #   {
        #       "tv:12345-S2": ["tv:12345-S2-E1", "tv:12345-S2-E2", ...],
        #       "tv:12345": ["tv:12345-S1", "tv:12345-S2", ...],
        #   }
        self.hierarchy_map = self._load_data(hierarchy_sets_file_path)

        # 2) Custom sets dictionary -> list of content_ids
        # Example:
        #   {
        #       "set:1": ["movie:111", "tv:333", ...],
        #   }
        self.custom_sets = self._load_data(custom_sets_file_path)
    
    def _load_data(self, file_path):
        try:
            return np.load(file_path, allow_pickle=True).item()
        except FileNotFoundError:
            return {}

    def _save_data(self, data, file_path):
        np.save(file_path, data, allow_pickle=True)

    def _register_parent_child(self, parent_id, child_id):
        """
        Tells the aggregator that child_id belongs to parent_id.
        """
        if parent_id not in self.hierarchy_map:
            self.hierarchy_map[parent_id] = []
        if child_id not in self.hierarchy_map[parent_id]:
            self.hierarchy_map[parent_id].append(child_id)
        self._save_data(self.hierarchy_map, "./data/hierarchy_sets.npy")

    def register_custom_set(self, content_ids):
        """
        Create or update a custom set with a list of content_ids.
        """
        set_id = f"set:{len(self.custom_sets)}" # e.g. "set:0", "set:1", ...
        self.custom_sets[set_id] = list(set(content_ids))
        self._save_data(self.custom_sets, "./data/custom_sets.npy")

    def add_item_to_set(self, set_id, content_id):
        _updated = False
        if set_id not in self.custom_sets:
            self.custom_sets[set_id] = []
            _updated = True
        if content_id not in self.custom_sets[set_id]:
            self.custom_sets[set_id].append(content_id)
            _updated = True
        if _updated:
            self.on_rating_updated(content_id)
            self._save_data(self.custom_sets, "./data/custom_sets.npy")

    def remove_item_from_set(self, set_id, content_id):
        if set_id in self.custom_sets:
            self.custom_sets[set_id] = [
                cid for cid in self.custom_sets[set_id]
                if cid != content_id
            ]
        self.on_rating_updated(content_id)
        self._save_data(self.custom_sets, "./data/custom_sets.npy")

    def on_rating_updated(self, content_id):
        """
        Called whenever a rating is updated for `content_id`.
        1. Recompute the parent's aggregate rating (if any).
        2. Recompute all sets that contain this content_id.
        """
        if content_id.startswith("set:"):
            # Recompute set's aggregate only, skip parse_content_id
            self._recompute_set_aggregate(content_id)
            return
        # Otherwise parse content_id
        parsed = parse_content_id(content_id)

        content_type = parsed.get("type")
        id_str = parsed.get("show_id")
        ssn_num = parsed.get("season_number")
        ep_num = parsed.get("episode_number")

        if content_type == "tv" and ep_num is not None:
            parent_id = f"tv:{id_str}-S{ssn_num}"
            self._register_parent_child(parent_id, content_id)
        if content_type == "tv" and ssn_num is not None:
            parent_id = f"tv:{id_str}"
            child_id = f"tv:{id_str}-S{ssn_num}"
            self._register_parent_child(parent_id, child_id)

        # 1) Recompute up the parent chain
        self._update_parents_recursive(content_id)

        # 2) Recompute for any custom sets that contain content_id
        self._update_custom_sets(content_id)

    def _update_parents_recursive(self, content_id):
        # For each parent that contains this content_id
        for parent_id, child_ids in self.hierarchy_map.items():
            if content_id in child_ids:
                # Recompute parent's aggregate from all children
                self._recompute_parent_aggregate(parent_id)

                # Then, recursively move up if the parent itself has a parent
                self._update_parents_recursive(parent_id)

    def _recompute_parent_aggregate(self, parent_id):
        """
        Look at all children of `parent_id`, compute average rating, and
        store it in parent's rating data (as, say, 'aggregate_rating').
        """
        child_ids = self.hierarchy_map.get(parent_id, [])
        ratings_list = []

        for cid in child_ids:
            # Load strategy to get the child's rating
            r = self.rating_manager.get_overall_rating(cid)
            if r is not None:
                ratings_list.append(r)

        if ratings_list:
            agg_val = round(sum(ratings_list) / len(ratings_list), 3)
        else:
            agg_val = None

        # Now load the parent's strategy and store agg_val
        parent_strategy = MixedRatingStrategy(parent_id)
        parent_strategy.load_rating(self.rating_manager)
        parent_strategy.aggregate_rating = agg_val
        parent_strategy.save_rating(self.rating_manager)

    def _update_custom_sets(self, content_id):
        """
        Find all sets containing this content_id, recompute their aggregates.
        """
        for set_id, items in self.custom_sets.items():
            if content_id in items:
                self._recompute_set_aggregate(set_id)

    def _recompute_set_aggregate(self, set_id):
        """
        Average the overall rating of all child items in the set,
        then store in a special rating entry for the set.
        """
        content_ids = self.custom_sets.get(set_id, [])
        ratings_list = []

        for cid in content_ids:
            r = self.rating_manager.get_preferred_rating(cid)
            if r is not None:
                ratings_list.append(r)

        if ratings_list:
            agg_val = round(sum(ratings_list) / len(ratings_list), 3)
        else:
            agg_val = None

        # Store set as if "set:id" had rating data then load the parent's rating and store agg_val
        set_rating= MixedRatingStrategy(set_id)
        set_rating.load_rating(self.rating_manager)
        set_rating.aggregate_rating = agg_val
        set_rating.save_rating(self.rating_manager)