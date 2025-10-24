function getTemplate(templateType) {
    const templates = {
        empty: {
            enableDebug: false,
            variables: {},
            defaults: {
                baseUrl: "",
                timeout: 30,
                headers: {},
                status: 200
            },
            steps: []
        },
        simple: {
            enableDebug: false,
            variables: {},
            defaults: {
                baseUrl: "https://jsonplaceholder.typicode.com",
                timeout: 30,
                headers: {
                    "Content-Type": "application/json"
                },
                status: 200
            },
            steps: [
                {
                    id: "getUser",
                    name: "Get user data",
                    method: "GET",
                    url: "/users/1",
                    validations: [
                        { jsonpath: ".id", exists: true }
                    ]
                },
                {
                    id: "getUserPosts",
                    name: "Get user's posts",
                    method: "GET",
                    url: "/users/{{ .responses.getUser.id }}/posts"
                }
            ]
        },
        oauth: {
            enableDebug: false,
            variables: {},
            defaults: {
                baseUrl: "https://oauth-provider.example.com",
                timeout: 30,
                headers: {
                    "Content-Type": "application/json"
                },
                status: 200
            },
            steps: [
                {
                    id: "requestAuthUrl",
                    name: "Request authorization URL",
                    method: "POST",
                    url: "/oauth/authorize",
                    body: {
                        client_id: "your-client-id",
                        redirect_uri: "http://localhost:8080/callback",
                        scope: "read write"
                    },
                    validations: [
                        { jsonpath: ".authorizationUrl", exists: true }
                    ],
                    launchBrowser: ".authorizationUrl"
                },
                {
                    id: "exchangeToken",
                    name: "Exchange code for token",
                    method: "POST",
                    url: "/oauth/token",
                    prompts: {
                        code: "Enter the authorization code from the callback:"
                    },
                    body: {
                        client_id: "your-client-id",
                        client_secret: "your-client-secret",
                        code: "{{ .input.code }}",
                        grant_type: "authorization_code"
                    },
                    validations: [
                        { jsonpath: ".access_token", exists: true }
                    ]
                },
                {
                    id: "getProfile",
                    name: "Access protected resource",
                    method: "GET",
                    url: "/api/user/profile",
                    headers: {
                        "Authorization": "Bearer {{ .responses.exchangeToken.access_token }}"
                    }
                }
            ]
        },
        "user-input": {
            enableDebug: false,
            variables: {},
            defaults: {
                baseUrl: "https://api.example.com",
                timeout: 30,
                headers: {
                    "Content-Type": "application/json"
                },
                status: 200
            },
            steps: [
                {
                    id: "login",
                    name: "User login",
                    method: "POST",
                    url: "/auth/login",
                    prompts: {
                        username: "Enter your username:",
                        password: "Enter your password:"
                    },
                    body: {
                        username: "{{ .input.username }}",
                        password: "{{ .input.password }}"
                    },
                    validations: [
                        { jsonpath: ".token", exists: true }
                    ]
                },
                {
                    id: "getProfile",
                    name: "Get user profile",
                    method: "GET",
                    url: "/user/profile",
                    headers: {
                        "Authorization": "Bearer {{ .responses.login.token }}"
                    }
                }
            ]
        }
    };

    return templates[templateType] || templates.empty;
}
