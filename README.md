### **CritiQit - A Unified Rating Platform**

**So What's the Goal?**

Create a multi-platform application (Web, iOS, Android) that allows authenticated users to rate, review, and organize various items using multiple flexible and hierarchical scoring systems. The platform will begin with support for movies and TV shows and is designed to be extensible to other domains like recipes or books.

**Key Features**

- **Flexible Rating System**: Users can rate an item using either a simple one_score or a detailed breakdown using user-defined, weighted categories.
- **Hierarchical Score Aggregation**: The system will automatically calculate roll-up scores (e.g., a Season's score is the average of its Episode ratings) using efficient database triggers.
- **User Collections**: Users can create and manage personal collections of items.
- **User Authentication**: Secure user sign-up, sign-in, sign-out, and profile management.

System Architecture & Methodology

- **Frontend**: React Native with Expo, developed web-first for rapid iteration.
- **Backend**: Supabase (Backend-as-a-Service).
- **Database**: PostgreSQL.
- **Development Environment**: Local Supabase instance managed by Docker, to ensure the project is well-containerized.
- **Development Planning**: GitHub Projects/Issues used to track project plans.
- **Repository**: Monorepo structure managed with npm workspaces, hosted on GitHub.
- **Approach**: Backend-first, Test-Driven Development (TDD). It’s always easier to define your intended behavior, and work up to it!