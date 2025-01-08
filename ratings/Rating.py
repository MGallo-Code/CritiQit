# ratings/Rating.py'

PRESET_CATEGORIES = {
    "Movie": [
        ["Plot", None, 1],
        ["Cinematography", None, 1],
        ["Acting", None, 1],
    ],
    "TV Show": [
        ["Plot", None, 1],
        ["Characters", None, 1],
        ["Production Value", None, 1],
    ],
    "Episode": [
        ["Story Continuity", None, 1],
        ["Performances", None, 1],
        ["Enjoyment", None, 1],
    ],
}

class Rating():
    """
    Stores either a single numeric rating (self.one_score) or category-based ratings (self.categories).
    If one_score is not None, that "wins" as the overall rating. Otherwise, we compute from categories.
    """

    def __init__(self, content_id):
        """
        content_id: a pre-formatted unique string like "tv:12345-S2-E2" or "movie:200"
        content_type: optional string if you want to store the type (movie, tv, etc.)
        """
        # Parse content type
        self.content_id = content_id
        self.content_type = content_id.split(":")[0]
        self.preferred_strategy = None
        # Single numeric rating
        self.one_score = None
        self.categories = {}
        # Computed rating from categories
        self.category_aggregate = None
        # Aggregate rating from seasons in a show / episodes in a season, etc.
        self.aggregate_rating = None

    def load_rating(self, rating_manager):
        """
        Load rating data from the rating_manager into this instance.
        """
        data = rating_manager.get_rating_data(self.content_id)
        if data:
            self.preferred_strategy = data.get("preferred_strategy")
            self.one_score = data.get("one_score")
            self.categories = data.get("categories", self.categories)
            self.category_aggregate = data.get("category_aggregate")
            self.aggregate_rating = data.get("aggregate_rating")

    def save_rating(self, rating_manager):
        # Recompute category_aggregate from categories
        self._calculate_category_aggregate()

        rating_data = {
            "content_id": self.content_id,
            "preferred_strategy": self.preferred_strategy,
            "one_score": self.one_score,
            "categories": self.categories,
            "category_aggregate": self.category_aggregate,
            "aggregate_rating": self.aggregate_rating
        }
        rating_manager.save_rating_data(rating_data)

    def get_overall_rating(self):
        if not self.preferred_strategy:
            return self.one_score if self.one_score is not None else self.category_aggregate if self.category_aggregate is not None else self.aggregate_rating if self.aggregate_rating is not None else None
        elif self.preferred_strategy == "one_score":
            return self.one_score
        elif self.preferred_strategy == "category_aggregate":
            return self.category_aggregate
        elif self.preferred_strategy == "aggregate_rating":
            return self.aggregate_rating

    def _calculate_category_aggregate(self):
        weighted_sum = 0
        total_weight = 0
        for cat_key, info in self.categories.items():
            val, weight = info[1], info[2]
            if val is not None:
                weighted_sum += val * weight
                total_weight += weight
        self.category_aggregate = round(weighted_sum / total_weight, 3) if total_weight > 0 else None
