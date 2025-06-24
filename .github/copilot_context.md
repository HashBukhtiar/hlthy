# Copilot Context for hlthy

This document provides GitHub Copilot with essential context about the **hlthy** app: its purpose, core features, user experience, terminology, and development goals. The purpose is to guide Copilot's suggestions and improve the quality of generated code and design ideas. This file should be updated as the app evolves.

## Overview

**hlthy** is a mobile iOS application built using **React Native** and developed using **Expo** (`npx expo start`). The app is a **fitness-focused social media platform** that encourages users to stay active and connected through community-driven engagement and content sharing.

The goal is to **foster motivation through visibility, milestones, and community interaction**, providing a healthier alternative to traditional fitness tracking apps or mainstream social platforms.

## Key Features

- **Posts & Feeds**
  - Users can create and view posts with photos, captions, and tags.
  - Posts can be filtered by activity type, recency, or popularity.

- **Milestones**
  - Users can create fitness-related goals (e.g., “Run 100km in 1 month”).
  - Progress is automatically tracked and visualized.
  - Milestones are sharable and visible in user profiles.

- **Profiles**
  - Users have customizable profiles displaying stats, milestones, and recent activity.

- **Social Interactions**
  - Likes, comments, and follows.
  - Future plan: Group challenges and accountability circles.

- **Notifications**
  - In-app push notifications for milestone progress, comments, and follows.

- **Fitness Integration**
  - Future plan: Sync with Apple Health and/or Strava.

## UI/UX Guidelines

- Clean, minimal UI prioritizing readability and motion.
- Design leans toward energetic and positive reinforcement (e.g. celebratory graphics for milestone completion).
- Feed and profile pages should avoid clutter. Progress elements use visual indicators like progress bars, circles, and checkmarks.
- Default color palette leans toward calming blues, fresh greens, and clean whites.

## Terminology

- **Milestone:** A user-defined fitness goal. Example: “Complete 20 workouts this month.” Visible on profile and shared in feed when achieved.
- **Activity:** A general tag for types of workouts (e.g. running, lifting, yoga).
- **Streak:** Number of consecutive days with activity. Future gamification element.
- **Feed:** The main page of the app with user-generated content.

## Development Stack

- **Frontend:** React Native with Expo
- **Platform:** iOS
- **Backend:** TBD (Firebase or Supabase planned)
- **Auth:** Email/password or OAuth (Apple/Google) [planned]
- **Notifications:** Expo push notifications
- **Version Control:** GitHub

## Design & Feature Philosophy

- Build for simplicity and daily use.
- Minimize distractions. Keep users focused on movement and progress.
- Celebrate personal wins and community support.

## Future Roadmap

- Group goals and public challenges
- Apple Health / Google Fit sync
- Leaderboards and weekly recaps
- Video post support
- Direct messaging

## Last Updated: 2025-06-24

_This file should be updated regularly to reflect new features, architecture changes, or key design decisions._
