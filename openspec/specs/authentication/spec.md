# authentication Specification

## Purpose
TBD - created by archiving change add-user-profile-backend. Update Purpose after archive.
## Requirements
### Requirement: User Signup with Email/Password

The system MUST allow users to create accounts using email and password credentials.

#### Scenario: New user creates account
**Given** a user visits the application for the first time
**When** they provide a valid email address and password (min 8 characters)
**Then** a new account is created in Supabase Auth
**And** the user receives a confirmation email (if email confirmation is enabled)
**And** the user is automatically signed in after confirmation

#### Scenario: User attempts signup with existing email
**Given** an email address already registered in the system
**When** a user attempts to sign up with that email
**Then** the system returns an error "Email already registered"
**And** no duplicate account is created

#### Scenario: User provides invalid email format
**Given** a user is on the signup form
**When** they enter an invalid email format (e.g., "notanemail")
**Then** the system shows a validation error "Please enter a valid email address"
**And** the signup request is not sent to the server

#### Scenario: User provides weak password
**Given** a user is on the signup form
**When** they enter a password shorter than 8 characters
**Then** the system shows an error "Password must be at least 8 characters"
**And** the signup request is not sent to the server

---

### Requirement: User Login with Email/Password

The system MUST allow users to authenticate using their registered email and password.

#### Scenario: User logs in with correct credentials
**Given** a registered user account with email "user@example.com"
**When** the user enters the correct email and password
**Then** the system authenticates the user
**And** returns a JWT access token and refresh token
**And** stores the session in localStorage and httpOnly cookie
**And** redirects the user to the main application dashboard

#### Scenario: User enters incorrect password
**Given** a registered user account
**When** the user enters the correct email but wrong password
**Then** the system returns an error "Invalid login credentials"
**And** the user remains on the login screen
**And** no session is created

#### Scenario: User enters unregistered email
**Given** an email address not in the system
**When** the user attempts to log in with that email
**Then** the system returns an error "Invalid login credentials"
**And** does not reveal whether the email exists (security measure)

---

### Requirement: SSO Authentication with Google

The system MUST allow users to sign up and log in using their Google accounts.

#### Scenario: User signs in with Google for the first time
**Given** a user has a Google account
**When** they click "Sign in with Google"
**Then** they are redirected to Google's OAuth consent screen
**And** after granting permission, a new account is created in Supabase
**And** the user is redirected back to the application
**And** a session is established with the user's Google email and profile info

#### Scenario: Returning user signs in with Google
**Given** a user previously signed up with Google
**When** they click "Sign in with Google"
**Then** they are authenticated without creating a duplicate account
**And** redirected to the application dashboard
**And** their existing profiles and data are accessible

#### Scenario: Google OAuth flow is cancelled
**Given** a user initiates Google SSO
**When** they cancel the consent screen or close the popup
**Then** the user is returned to the login page
**And** an informational message is shown "Authentication cancelled"
**And** no account is created

---

### Requirement: SSO Authentication with Apple

The system MUST allow users to sign up and log in using their Apple ID.

#### Scenario: User signs in with Apple for the first time
**Given** a user has an Apple ID
**When** they click "Sign in with Apple"
**Then** they are redirected to Apple's authentication screen
**And** after authentication, a new account is created in Supabase
**And** the user's email (or relay email) is associated with the account
**And** the user is redirected back to the application with an active session

#### Scenario: User signs in with Apple (Hide My Email enabled)
**Given** a user chooses to hide their email via Apple
**When** they complete Apple Sign In
**Then** Supabase receives Apple's relay email (e.g., "xyz@privaterelay.appleid.com")
**And** the account is created with the relay email
**And** the user can still authenticate and access their data

---

### Requirement: Session Management

The system MUST maintain user sessions across page refreshes and enforce token expiration.

#### Scenario: User refreshes the page while logged in
**Given** an authenticated user with an active session
**When** the user refreshes the browser page
**Then** the session is restored from localStorage
**And** the user remains logged in
**And** protected API routes continue to work

#### Scenario: Access token expires
**Given** a user session with an expired access token (default 1 hour)
**When** the user makes an API request
**Then** the Supabase client automatically refreshes the token using the refresh token
**And** the request succeeds with the new token
**And** the user is not logged out

#### Scenario: Refresh token expires
**Given** a user session with an expired refresh token (default 30 days of inactivity)
**When** the user attempts to use the application
**Then** the session is cleared
**And** the user is redirected to the login page
**And** a message is shown "Your session has expired. Please log in again."

---

### Requirement: User Logout

The system MUST allow users to end their session and clear authentication state.

#### Scenario: User logs out from the application
**Given** an authenticated user
**When** they click the "Log Out" button
**Then** the Supabase session is terminated
**And** localStorage and cookies are cleared
**And** the user is redirected to the login page
**And** subsequent API requests return 401 Unauthorized

---

### Requirement: Protected API Routes

All profile-related and analysis API endpoints MUST require valid authentication.

#### Scenario: Authenticated user accesses protected route
**Given** a user with a valid JWT access token
**When** they make a request to `/api/profiles`
**Then** the middleware validates the JWT
**And** extracts the user_id from the token
**And** the request proceeds to the route handler

#### Scenario: Unauthenticated user attempts to access protected route
**Given** a request without an access token
**When** the request is sent to `/api/profiles`
**Then** the middleware returns 401 Unauthorized
**And** the response body contains `{ error: "Unauthorized" }`
**And** the route handler is not executed

#### Scenario: User with expired token accesses protected route
**Given** a request with an expired JWT
**When** the request is sent to `/api/profiles`
**Then** the middleware attempts token refresh
**And** if refresh succeeds, the request proceeds
**And** if refresh fails, returns 401 Unauthorized

---

### Requirement: User Profile Context

The application MUST provide the authenticated user's information to all components.

#### Scenario: Application loads for authenticated user
**Given** a user with an active session
**When** the application initializes
**Then** the Supabase client fetches the current user
**And** user information (id, email, metadata) is available in React context
**And** components can access `user.id` for API requests

#### Scenario: Application loads for unauthenticated user
**Given** no active session exists
**When** the application initializes
**Then** the user context is null
**And** the login/signup UI is displayed
**And** protected features are hidden or disabled

---

### Requirement: Authentication UI Components

The application MUST provide intuitive UI for authentication flows.

#### Scenario: User views login page
**Given** an unauthenticated user
**When** they visit the application
**Then** a login form is displayed with:
- Email input field
- Password input field
- "Sign In" button
- "Sign in with Google" button
- "Sign in with Apple" button
- "Don't have an account? Sign up" link

#### Scenario: User switches from login to signup
**Given** a user on the login page
**When** they click "Don't have an account? Sign up"
**Then** the signup form is displayed with:
- Email input field
- Password input field
- Password confirmation field
- "Create Account" button
- SSO buttons (Google, Apple)
- "Already have an account? Sign in" link

#### Scenario: Authentication error is displayed
**Given** a user attempts login with wrong credentials
**When** the error is returned from Supabase
**Then** a user-friendly error message is displayed above the form
**And** the form fields remain populated (except password)
**And** the user can retry without re-entering all information

---

