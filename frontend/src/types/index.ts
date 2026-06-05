// User types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  createdAt: string
}

// Auth types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface AuthResponse {
  accessToken: string
  expiresAt: string
  user: {
    id: string
    email: string
    fullName: string
  }
}

// Project types
export interface Project {
  id: string
  title: string
  description?: string
  createdAt: string
  ownerId?: string
}

export interface CreateProjectRequest {
  title: string
  description?: string
}

// Task types
export type TaskStatus = 'ToDo' | 'InProgress' | 'Done'
export type TaskPriority = 'Low' | 'Medium' | 'High'

export interface TaskItem {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  project?: { id: string; title: string }
  team?: { id: string; name: string }
  assignee?: { id: string; fullName: string; email: string }
  comments?: TaskComment[]
  dueDate?: string
  createdAt: string
}

export interface TaskComment {
  id: string
  content: string
  taskItemId: string
  authorUserId: string
  author?: {
    id: string
    email: string
    firstName: string
    lastName: string
    fullName: string
  }
  createdAt: string
}

export interface CreateTaskRequest {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  projectId: string
  teamId: string | null
  assigneeUserId: string | null
}

export interface UpdateTaskRequest {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  teamId: string | null
  assigneeUserId: string | null
  dueDate: string | null
}

// Team types
export interface Team {
  id: string
  name: string
  description?: string
  projectId: string
  createdAt: string
}

export interface CreateTeamRequest {
  name: string
  description?: string
  projectId: string
}

// Comment types
export interface Comment {
  id: string
  content: string
  taskId: string
  authorUserId: string
  createdAt: string
}
// Notification types
export interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  readAt?: string
  relatedId?: string
  relatedType?: string
}
// Rating types
export interface LeaderboardEntry {
  userId: string
  fullName: string
  email: string
  totalPoints: number
  rank: number
  tasksCompleted: number
}
// Stats types
export interface UserStats {
  userId: string
  totalPoints: number
  rank: number
  tasksCompleted: number
  tasksCompletedHigh: number
  tasksCompletedMedium: number
  tasksCompletedLow: number
  commentsCount: number
}
// Message types
export interface ChatMessage {
  id: string
  content: string
  authorUserId: string
  authorName: string
  createdAt: string
}
// Attachment types
export interface TaskAttachment {
  id: string
  fileName: string
  originalFileName: string
  contentType: string
  fileSize: number
  uploadedByUserId: string
  uploadedByName: string
  createdAt: string
}
// Mentor types
export interface MentorProject {
  projectId: string
  title: string
  description?: string
  totalMembers: number
  totalTasks: number
  completedTasks: number
}

export interface Mentee {
  userId: string
  fullName: string
  email: string
  role: string
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  todoTasks: number
  totalPoints: number
}

export interface MentorNote {
  id: string
  aboutUserId: string
  projectId: string
  content: string
  createdAt: string
  updatedAt?: string
}