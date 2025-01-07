# ratings/RatingManager.py

import numpy as np
from ratings.SetManager import SetManager

class RatingManager:
    """
    A rating manager that loads/saves rating data as dictionaries.
    """

    def __init__(self, file_path="./data/saved_ratings.npy"):
        self.file_path = file_path
        self.rating_data_store = self._load_data()
        self.set_manager = SetManager(self)

    def _load_data(self):
        try:
            return np.load(self.file_path, allow_pickle=True).item()
        except FileNotFoundError:
            return {}

    def _save_data(self):
        np.save(self.file_path, self.rating_data_store, allow_pickle=True)

    def get_rating_data(self, content_id):
        return self.rating_data_store.get(content_id)

    def get_overall_rating(self, content_id):
        data = self.get_rating_data(content_id)
        if data:
            preferred_strategy = data.get("preferred_strategy", None)
            one_score = data.get("one_score")
            category_aggregate = data.get("category_aggregate")
            aggregate_rating = data.get("aggregate_rating")
            if not preferred_strategy:
                return one_score if one_score is not None else category_aggregate if category_aggregate is not None else aggregate_rating if aggregate_rating is not None else None
            elif preferred_strategy == "one_score":
                return one_score
            elif preferred_strategy == "category_aggregate":
                return category_aggregate
            elif preferred_strategy == "aggregate_rating":
                return aggregate_rating
        
    def get_preferred_rating(self, content_id):
        data = self.get_rating_data(content_id)
        if data:
            preferred_strategy = data.get("preferred_strategy", None)
            if not preferred_strategy:
                return None
            else:
                return data.get(preferred_strategy)

    def save_rating_data(self, content_id, data_dict):
        self.rating_data_store[content_id] = data_dict
        self._save_data()
        self.set_manager.on_rating_updated(content_id)

    def delete_rating_data(self, content_id):
        if content_id in self.rating_data_store:
            del self.rating_data_store[content_id]
            self._save_data()

        self.set_manager.on_rating_updated(content_id)