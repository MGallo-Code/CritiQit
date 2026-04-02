### **CritiQit - A Unified Rating Platform**

I find the normal 5 or 10-star rating systems too limiting. I wanted a better way to rate the movies and television shows I like, without those limits. So, I started developing CritiQit!

The intent of this project is to create a multi-platform application (Web, iOS, Android) that allows authenticated users to rate, review, and organize various items using multiple flexible and hierarchical scoring systems developed by myself. 

The platform will begin with support for movies and TV shows, but I'd like to later reach out to other domains like recipes or books.

**Features**

- **Flexible Rating System**: Users can rate an item using either a simple one_score {float/10} or a detailed breakdown using user-defined, weighted categories.
- **Hierarchical Score Aggregation**: The system will automatically calculate roll-up scores (e.g., a Season's score is the average of its Episode ratings) using database triggers.
- **User Collections**: Users can create and manage personal collections of items.
- **User Authentication**: Secure user sign-up, sign-in, sign-out, and profile management.

**System Architecture & Methodology**

- **Frontend**: React Native with Expo, developed web-first for rapid iteration.
- **Backend**: Supabase (Backend-as-a-Service).
- **Database**: PostgreSQL.
- **Development Environment**: Local Supabase instance managed by Docker, to ensure the project is well-containerized.
- **Approach**: Backend-first, Test-Driven Development (TDD). It’s always easier to define your intended behavior, and work up to it!
