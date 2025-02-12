// This is the configuration file for your torrent tracker site.
// Copy it to config.js and modify the values to match your desired setup.

module.exports = {
  envs: {
    // The name of your tracker site. Maximum 20 characters.
    SQ_SITE_NAME: "Change My Name",

    // A short description of your tracker site. Maximum 80 characters.
    SQ_SITE_DESCRIPTION: "Change My Description",

    // Customize the color theme of your site.
    // 
    // - To use the default light and dark themes with your primary brand color, 
    //   specify only the "primary" color.
    // - To create a fully custom theme, specify all the colors.
    // - If no colors are specified, the default light and dark themes will be used.
    // - MAKE SURE TO USE 6 CHARACTER HEX CODES (ex. #000000) NOT (ex. #000)
    SQ_CUSTOM_THEME: {
      primary: "#0e6fc9",        // Your main brand color
      background: "#1f2023",     // Page background color
      sidebar: "#27282b",      // Sidebar and infobox background color
      border: "#303236",        // Border color
      text: "#f8f8f8",          // Main text color
      grey: "#aaaaaa",          // Secondary text color
    },

    // Control user registration.
    // - "open": Anyone can register.
    // - "invite": Users must be invited by an existing user.
    // - "closed": No one can register.
    SQ_ALLOW_REGISTER: "invite",

    // Allow users to upload torrents anonymously.
    // (Admins can still see the uploader's identity.)
    SQ_ALLOW_ANONYMOUS_UPLOADS: false,

    // Set the minimum ratio required for users to download torrents. 
    // Set to -1 to disable this requirement.
    SQ_MINIMUM_RATIO: 0.75,

    // Set the maximum number of hit-and-runs allowed before a user is blocked from downloading.
    // A hit-and-run occurs when a user downloads a torrent completely but doesn't seed it back to a 1:1 ratio.
    // Set to -1 to disable this limit.
    SQ_MAXIMUM_HIT_N_RUNS: 3,

    // Define the torrent categories available on your site.
    // For each category, list the allowed sources (e.g., "BluRay", "WebDL").
    SQ_TORRENT_CATEGORIES: {
      Movies: ["BluRay", "WebDL", "HDRip", "WebRip", "DVD", "Cam"],
      TV:,
      Music:,
      Books:,
    },

    // Configure bonus points:

    // Number of bonus points earned per GB uploaded.
    SQ_BP_EARNED_PER_GB: 3,

    // Bonus points earned for suggesting a torrent that fulfills a request.
    // Double the points if the user also uploads the accepted torrent.
    SQ_BP_EARNED_PER_FILLED_REQUEST: 10,

    // Bonus points required to purchase an invite. (Set to 0 to disable buying invites.)
    SQ_BP_COST_PER_INVITE: 20,

    // Bonus points required to purchase 1 GB of upload credit. (Set to 0 to disable buying upload.)
    SQ_BP_COST_PER_GB: 10,

    // Enable site-wide freeleech for all torrents.
    SQ_SITE_WIDE_FREELEECH: false,

    // Allow unregistered users to view torrent pages.
    // This helps with search engine indexing but allows anyone to see torrent information.
    SQ_ALLOW_UNREGISTERED_VIEW: false,

    // Blacklist certain file extensions to prevent uploads containing those types of files.
    SQ_EXTENSION_BLACKLIST: [
      "exe", "msi", "bat", "cmd", "vbs", "ps1", "sh", "bash", "apk", "app",
      "scr", "cpl", "dll", "ocx", "pif", "reg", "wsf"
    ],

    // Set the default language for your site.
    // See `client/locales/index.js` for available options.
    SQ_SITE_DEFAULT_LOCALE: "en",

    // The URL of your tracker site.
    // - For local development, use `http://127.0.0.1:3000`.
    // - For production, use your actual domain name (e.g., `https://yourtracker.com`).
    SQ_BASE_URL: "http://ipaddress:80",

    // The URL of your API.
    // - For local development, use `http://127.0.0.1:3001`.
    // - For production, use the API endpoint of your domain (e.g., `https://yourtracker.com/api`).
    SQ_API_URL: "http://ipaddress:3001",

    // The connection string for your MongoDB database.
    // - For local development, use `mongodb://127.0.0.1/sqtracker`.
    // - For production, use the appropriate connection string for your MongoDB server.
    SQ_MONGO_URL: "mongodb://username:password@ipaddress:27017/sqtracker",

    // Disable sending emails. (Useful for testing, but not recommended for production.)
    SQ_DISABLE_EMAIL: false,

    // The email address that emails will be sent from.
    SQ_MAIL_FROM_ADDRESS: "changeme@example.com",

    // SMTP server settings for sending emails:

    // The hostname of your SMTP server.
    SQ_SMTP_HOST: "smtp.example.com",

    // The port of your SMTP server.
    SQ_SMTP_PORT: 587,

    // Whether to force TLS encryption for SMTP connections.
    SQ_SMTP_SECURE: false, 
  },
  secrets: {
    // A secret key used to sign authentication tokens. 
    // This should be a long, random, and secure string.
    SQ_JWT_SECRET: "Long_40_char_code",

    // A secret key used to verify server requests. 
    // This should be different from the JWT secret and also be long, random, and secure.
    SQ_SERVER_SECRET: "Long_40_char_code",

    // The email address for the initial admin user.
    SQ_ADMIN_EMAIL: "admin@example.com",

    // Credentials for authenticating with your SMTP server:

    // The username for your SMTP server.
    SQ_SMTP_USER: "chnageme@example.com",

    // The password for your SMTP server.
    SQ_SMTP_PASS: "Email_Password_or_app_password",
  },
};
