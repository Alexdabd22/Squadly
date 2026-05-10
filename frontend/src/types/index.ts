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
  projectId: string
  teamId?: string
  assigneeUserId?: string
  createdAt: string
  dueDate?: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  projectId: string
  teamId?: string
  assigneeUserId?: string
  dueDate?: string
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