import re

# clean_title function has been moved to utils.tmdb.helpers

def parse_content_id(content_id):
    """
    Parse a content_id string like:
      - "movie:12345"
      - "tv:12345"
      - "tv:12345-S2"
      - "tv:12345-S2-E5"
      - "recipe:1235208"
      - "etc:243662"

    Return a dictionary:
      {
        "type": "movie","tv", "recipe", etc...,
        "show_id": "12345" (string),
        "season_number": 2 or None,
        "episode_number": 5 or None
      }
    Raise ValueError if it's malformed.
    """
    if content_id.startswith("movie:"):
        # e.g. "movie:12345"
        raw_id = content_id[len("movie:"):]
        if not raw_id:
            raise ValueError(f"Malformed movie content_id: {content_id}")
        return {
            "type": "movie",
            "show_id": raw_id, # for movies, "show_id" is basically the numeric ID
            "season_number": None,
            "episode_number": None
        }

    elif content_id.startswith("tv:"):
        # e.g. "tv:12345-S2-E5"
        remainder = content_id[len("tv:"):]  # remove "tv:" prefix
        if not remainder:
            raise ValueError(f"No ID found after 'tv:' prefix in {content_id}")

        # Check if there's a '-S'
        parts = remainder.split("-S", maxsplit=1)
        show_id_str = parts[0]   # e.g. "12345"
        season_number_str = None
        episode_number_str = None

        if len(parts) == 2:
            # we have "2" or "2-E5"
            season_part = parts[1]
            # Possibly has '-E'
            ep_parts = season_part.split("-E", maxsplit=1)
            season_number_str = ep_parts[0]  # e.g. "2"
            if len(ep_parts) == 2:
                # user had "2-E5"
                episode_number_str = ep_parts[1]

        return {
            "type": "tv",
            "show_id": show_id_str,
            "season_number": int(season_number_str) if season_number_str else None,
            "episode_number": int(episode_number_str) if episode_number_str else None
        }

    elif content_id.startswith("set:"):
        # e.g. "set:12345"
        raw_id = content_id[len("set:"):]
        if not raw_id:
            raise ValueError(f"Malformed set content_id: {content_id}")
        return {
            "type": "set",
            "set_id": raw_id
        }

    else:
        raise ValueError(f"Unknown content prefix in content_id: {content_id}") 