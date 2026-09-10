export interface User {
  id: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  level: number;
  totalSavedAmount: number;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  nickname: string;
}
