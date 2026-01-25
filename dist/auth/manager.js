"use strict";
/**
 * FlowSpec CLI - Authentication Manager
 * Handles user signup, login, and credential management
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const axios_1 = __importDefault(require("axios"));
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
class AuthManager {
    constructor() {
        this.credentialsPath = path.join(os.homedir(), '.flowspec', 'credentials.json');
        // Check for API URL in environment variable first
        // Then check current project config if available
        let apiUrl = process.env.FLOWSPEC_API_URL;
        if (!apiUrl) {
            // Try to get API URL from project config
            const projectConfigPath = path.join(process.cwd(), '.flowspec', 'config.json');
            if (fs.existsSync(projectConfigPath)) {
                try {
                    const config = JSON.parse(fs.readFileSync(projectConfigPath, 'utf-8'));
                    if (config.apiUrl) {
                        apiUrl = config.apiUrl;
                    }
                }
                catch (error) {
                    // Ignore config read errors
                }
            }
        }
        this.apiUrl = apiUrl || 'https://api.flowmails.work';
        // Ensure .flowspec directory exists
        const flowspecDir = path.dirname(this.credentialsPath);
        if (!fs.existsSync(flowspecDir)) {
            fs.mkdirSync(flowspecDir, { recursive: true });
        }
    }
    /**
     * User signup flow
     */
    async signup() {
        console.log(chalk_1.default.blue('Creating your FlowSpec account...\n'));
        const answers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Your full name:',
                validate: (input) => input.trim().length > 0 || 'Name is required'
            },
            {
                type: 'input',
                name: 'email',
                message: 'Email address:',
                validate: (input) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return emailRegex.test(input) || 'Please enter a valid email address';
                }
            },
            {
                type: 'password',
                name: 'password',
                message: 'Password (min 8 characters):',
                validate: (input) => input.length >= 8 || 'Password must be at least 8 characters'
            }
        ]);
        const spinner = (0, ora_1.default)('Creating account...').start();
        try {
            const response = await axios_1.default.post(`${this.apiUrl}/auth/signup`, {
                name: answers.name,
                email: answers.email,
                password: answers.password
            }, {
                timeout: 30000 // 30 second timeout
            });
            const credentials = {
                userId: response.data.user_id,
                email: response.data.email,
                name: response.data.name,
                accessToken: response.data.access_token,
                plan: response.data.plan
            };
            this.saveCredentials(credentials);
            spinner.succeed('Account created successfully!');
            console.log(chalk_1.default.green('\n🎉 Welcome to FlowSpec!'));
            console.log(chalk_1.default.gray(`   Email: ${credentials.email}`));
            console.log(chalk_1.default.gray(`   Plan: ${credentials.plan}`));
            console.log(chalk_1.default.yellow('\nNext steps:'));
            console.log('  1. cd your-react-project');
            console.log('  2. flowspec init');
            console.log('  3. flowspec embed');
            console.log('  4. flowspec watch');
        }
        catch (error) {
            spinner.fail('Account creation failed');
            if (error.response?.data?.detail) {
                throw new Error(error.response.data.detail);
            }
            else {
                throw new Error('Failed to create account. Please try again.');
            }
        }
    }
    /**
     * User login flow
     */
    async login() {
        console.log(chalk_1.default.blue('Login to FlowSpec\n'));
        const answers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'email',
                message: 'Email address:',
                validate: (input) => input.trim().length > 0 || 'Email is required'
            },
            {
                type: 'password',
                name: 'password',
                message: 'Password:',
                validate: (input) => input.trim().length > 0 || 'Password is required'
            }
        ]);
        const spinner = (0, ora_1.default)('Logging in...').start();
        try {
            const response = await axios_1.default.post(`${this.apiUrl}/auth/login`, {
                email: answers.email,
                password: answers.password
            }, {
                timeout: 30000 // 30 second timeout
            });
            const credentials = {
                userId: response.data.user_id,
                email: response.data.email,
                name: response.data.name,
                accessToken: response.data.access_token,
                plan: response.data.plan
            };
            this.saveCredentials(credentials);
            spinner.succeed('Logged in successfully!');
            console.log(chalk_1.default.green(`\n👋 Welcome back, ${credentials.name}!`));
            console.log(chalk_1.default.gray(`   Plan: ${credentials.plan}`));
        }
        catch (error) {
            spinner.fail('Login failed');
            // Handle network errors
            if (!error.response) {
                if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                    throw new Error(`Cannot connect to server at ${this.apiUrl}. Please check if the server is running.`);
                }
                if (error.code === 'ETIMEDOUT') {
                    throw new Error('Connection timeout. Please check your internet connection and try again.');
                }
                throw new Error(`Network error: ${error.message || 'Unable to connect to server'}`);
            }
            const responseData = error.response.data;
            const status = error.response.status;
            const errorObj = responseData?.error;
            // Handle unverified email (403 status)
            if (status === 403) {
                let detail = null;
                // Try to extract detail from error object
                // New format: error object has fields directly (email_verified, message, email)
                if (errorObj && typeof errorObj === 'object') {
                    if (errorObj.email_verified === false || errorObj.email_verified === 'False') {
                        detail = errorObj;
                    }
                    else if (errorObj.message) {
                        // Old format: message contains stringified Python dict
                        try {
                            const messageStr = errorObj.message;
                            if (typeof messageStr === 'string' && (messageStr.startsWith('{') || messageStr.includes("'message'"))) {
                                // Parse Python dict string representation
                                const jsonStr = messageStr
                                    .replace(/'/g, '"')
                                    .replace(/False/g, 'false')
                                    .replace(/True/g, 'true')
                                    .replace(/None/g, 'null');
                                detail = JSON.parse(jsonStr);
                            }
                        }
                        catch (e) {
                            // Parsing failed, continue
                        }
                    }
                }
                // Check if we have the unverified email structure
                if (detail && typeof detail === 'object' &&
                    (detail.email_verified === false || detail.email_verified === 'False' || detail.email_verified === 'false')) {
                    console.log(chalk_1.default.yellow('\n📧 Email Verification Required'));
                    console.log(chalk_1.default.white(detail.message || 'Your email address has not been verified.'));
                    console.log(chalk_1.default.gray(`\n   A verification email has been sent to: ${detail.email || answers.email}`));
                    console.log(chalk_1.default.gray('   Please check your email and click the verification link.'));
                    console.log(chalk_1.default.gray('   After verifying, you can login again.\n'));
                    throw new Error('Email verification required');
                }
                // Fallback for other 403 errors
                throw new Error(errorObj?.message || 'Access forbidden');
            }
            else if (status === 401) {
                throw new Error('Invalid email or password');
            }
            else {
                // Handle other errors
                const message = errorObj?.message || responseData?.detail || error.message || 'Login failed. Please try again.';
                throw new Error(message);
            }
        }
    }
    /**
     * Logout user
     */
    async logout() {
        if (fs.existsSync(this.credentialsPath)) {
            fs.unlinkSync(this.credentialsPath);
        }
    }
    /**
     * Get current user credentials
     */
    getCredentials() {
        try {
            if (!fs.existsSync(this.credentialsPath)) {
                return null;
            }
            const data = fs.readFileSync(this.credentialsPath, 'utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const credentials = this.getCredentials();
        return credentials !== null && credentials.accessToken.length > 0;
    }
    /**
     * Get authorization header for API requests
     */
    getAuthHeader() {
        const credentials = this.getCredentials();
        if (!credentials) {
            return {};
        }
        return {
            Authorization: `Bearer ${credentials.accessToken}`
        };
    }
    /**
     * Ensure user is authenticated, prompt login if not
     */
    async ensureAuthenticated() {
        const credentials = this.getCredentials();
        if (!credentials) {
            console.log(chalk_1.default.yellow('⚠️  You need to login first.'));
            await this.login();
            return this.getCredentials();
        }
        // TODO: Add token validation/refresh logic here
        return credentials;
    }
    /**
     * Save credentials to file
     */
    saveCredentials(credentials) {
        fs.writeFileSync(this.credentialsPath, JSON.stringify(credentials, null, 2));
    }
}
exports.AuthManager = AuthManager;
//# sourceMappingURL=manager.js.map