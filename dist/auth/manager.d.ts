/**
 * FlowSpec CLI - Authentication Manager
 * Handles user signup, login, and credential management
 */
interface Credentials {
    userId: string;
    email: string;
    name: string;
    accessToken: string;
    plan: string;
}
export declare class AuthManager {
    private credentialsPath;
    private apiUrl;
    constructor();
    /**
     * User signup flow
     */
    signup(): Promise<void>;
    /**
     * User login flow
     */
    login(): Promise<void>;
    /**
     * Logout user
     */
    logout(): Promise<void>;
    /**
     * Get current user credentials
     */
    getCredentials(): Credentials | null;
    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean;
    /**
     * Get authorization header for API requests
     */
    getAuthHeader(): {
        Authorization: string;
    } | {};
    /**
     * Ensure user is authenticated, prompt login if not
     */
    ensureAuthenticated(): Promise<Credentials>;
    /**
     * Save credentials to file
     */
    private saveCredentials;
}
export {};
//# sourceMappingURL=manager.d.ts.map