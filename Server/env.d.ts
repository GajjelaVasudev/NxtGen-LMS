declare namespace NodeJS {
  interface ProcessEnv {
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_CALLBACK_URL?: string;
    BASE_URL?: string;
    ADMIN_SECRET?: string;
    EMAIL_FROM?: string;
    PING_MESSAGE?: string;
    PORT?: string;
  }
}
