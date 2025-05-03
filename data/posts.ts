// Mock post data for the hlthy app
// This file is used by both HomeFeed and ViewPost screens

export interface Comment {
  id: string;
  username: string;
  profilePic: string;
  text: string;
  timestamp: string;
  likes: number;
  liked: boolean;
}

export interface AttachedWorkout {
  id: string;
  title: string;
  author: string;
  length: string;
  segments: number;
  details?: string; // Optional formatted details string
}

export interface AttachedMilestone {
  id: string;
  title: string;
  achievement: string;
  date: string;
  category: string;
  details?: string; // Optional formatted details string
}

export interface Post {
  id: string;
  username: string;
  fullName: string;
  profilePic: string;
  imageUrl: string;
  caption: string;
  timestamp: string;
  location: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  isBookmarked: boolean;
  commentsList?: Comment[];
  attachedWorkout?: AttachedWorkout;
  attachedMilestone?: AttachedMilestone;
}

// Mock data for the app
const posts: Post[] = [
  {
    id: '1',
    username: 'alex_fitness',
    fullName: 'Alex Johnson',
    profilePic: 'https://randomuser.me/api/portraits/men/22.jpg',
    imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    caption: 'Just finished my morning workout session! Feeling great and ready to tackle the day. #fitness #health #motivation',
    timestamp: '20m ago',
    location: 'Fitness First Gym',
    likes: 156,
    comments: 12,
    isLiked: false,
    isBookmarked: false,
    commentsList: [
      {
        id: '101',
        username: 'fitnessGuru',
        profilePic: 'https://randomuser.me/api/portraits/men/32.jpg',
        text: 'Amazing progress! Keep up the great work!',
        timestamp: '2h ago',
        likes: 12,
        liked: false,
      },
      {
        id: '102',
        username: 'workout_enthusiast',
        profilePic: 'https://randomuser.me/api/portraits/women/67.jpg',
        text: 'This looks intense! What was the most challenging part?',
        timestamp: '1h ago',
        likes: 5,
        liked: false,
      }
    ],
    attachedWorkout: {
      id: '101',
      title: 'Morning HIIT Session',
      author: 'Alex Johnson',
      length: '45min',
      segments: 4,
      details: 'by Alex Johnson • 4 segments • 45min'
    }
  },
  {
    id: '2',
    username: 'health_junkie',
    fullName: 'Sarah Williams',
    profilePic: 'https://randomuser.me/api/portraits/women/44.jpg',
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    caption: 'Made this protein-packed breakfast bowl to fuel my day! Featuring fresh berries, Greek yogurt, and homemade granola. #healthyeating #breakfast #nutrition',
    timestamp: '1h ago',
    location: 'Home Kitchen',
    likes: 243,
    comments: 18,
    isLiked: true,
    isBookmarked: true,
    commentsList: [
      {
        id: '201',
        username: 'nutritionist_pro',
        profilePic: 'https://randomuser.me/api/portraits/women/23.jpg',
        text: 'Great balance of macronutrients! Love the colors too.',
        timestamp: '45m ago',
        likes: 8,
        liked: true,
      },
      {
        id: '202',
        username: 'fitness_fan',
        profilePic: 'https://randomuser.me/api/portraits/men/45.jpg',
        text: 'This looks amazing! Recipe please!',
        timestamp: '30m ago',
        likes: 3,
        liked: false,
      }
    ]
  },
  {
    id: '3',
    username: 'runner_dave',
    fullName: 'Dave Peterson',
    profilePic: 'https://randomuser.me/api/portraits/men/32.jpg',
    imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    caption: 'New personal best on my 10K run today! Hard work pays off. #running #personalrecord #fitness',
    timestamp: '3h ago',
    location: 'City Park Trail',
    likes: 189,
    comments: 24,
    isLiked: false,
    isBookmarked: false,
    commentsList: [
      {
        id: '301',
        username: 'marathon_runner',
        profilePic: 'https://randomuser.me/api/portraits/women/28.jpg',
        text: 'Great job! What was your pace?',
        timestamp: '2h ago',
        likes: 7,
        liked: false,
      },
      {
        id: '302',
        username: 'coach_smith',
        profilePic: 'https://randomuser.me/api/portraits/men/52.jpg',
        text: 'Excellent progress Dave! Let\'s work on breaking 40 minutes next!',
        timestamp: '1h ago',
        likes: 12,
        liked: false,
      }
    ],
    attachedWorkout: {
      id: '301',
      title: '10K Morning Run',
      author: 'Dave Peterson',
      length: '45min',
      segments: 1,
      details: 'by Dave Peterson • 1 segment • 45min'
    },
    attachedMilestone: {
      id: '301',
      title: '10K Run Personal Best',
      achievement: 'Ran 10K in under 45 minutes',
      date: 'May 2, 2025',
      category: 'Running',
      details: 'Ran 10K in under 45 minutes • May 2, 2025'
    }
  }
];

export default posts;

// Helper function to find a post by ID
export function getPostById(id: string): Post | undefined {
  return posts.find(post => post.id === id);
}