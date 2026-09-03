# Wedding Video Gallery Platform (PHP + MySQL Edition)

A professional client video delivery platform for wedding photographers. Videos are hosted and streamed directly from the photographer's **Google Drive**, while the application manages metadata, client access, security, events grouping, and cinematic video delivery.

---

## 🌟 Key Features

1. **Google Drive Cloud Storage Source**:
   - Videos are never uploaded to or stored on your web server.
   - The application connects via Google Drive OAuth 2.0 or direct folder link scanning.
   - Automatically detects root videos and subfolders (e.g. *Haldi, Mehndi, Sangeet, Baraat, Wedding, Reception*).

2. **HTTP 206 Partial Content High-Definition Streaming**:
   - Memory-safe streaming proxy (`/api/videos/{id}/stream`).
   - Forwards byte `Range` headers to upstream Google Drive servers.
   - Instant timeline seeking across multi-gigabyte video files with no server RAM overhead.

3. **Client Cinema Gallery Experience**:
   - Private client URLs (`/gallery/{access_code}`).
   - Romantic typography (Cormorant Garamond + Inter) and luxury dark & gold visual theme.
   - Event filter tabs and responsive video cards.
   - Optional password protection gate.

4. **Photographer Studio Admin Panel**:
   - Dashboard with stats (total projects, films delivered, Drive connection status).
   - Create and edit wedding projects with real-time Google Drive scanning.
   - Studio branding customization (studio name, accent colors, logo).

---

## 🏗 Directory Structure

```
php-app/
├── app/
│   ├── Controllers/
│   │   ├── Admin/         # AuthController, DashboardController, WeddingController, DriveController, SettingsController
│   │   ├── Api/           # VideoStreamController (206 stream), DriveApiController
│   │   └── Gallery/       # ClientGalleryController
│   ├── Core/              # Router, Database (PDO), Request, Response, View, Session, Auth, Encryption
│   ├── Middleware/        # AuthMiddleware, GuestMiddleware
│   ├── Models/            # User, Wedding, DriveConnection, EventModel, Video, ClientGallery, GallerySetting, ClientSession
│   └── Services/          # DriveScannerService, VideoStreamService, GoogleAuthService, GoogleDriveService, DriveUrlParser
├── bin/
│   └── console            # CLI runner for migrations, seeding, and drive sync
├── config/                # app.php, database.php, google.php
├── database/
│   └── schema.sql         # 8 MySQL normalized tables
├── public/
│   ├── assets/
│   │   ├── css/style.css  # Luxury dark & gold design system
│   │   └── js/            # player.js, scanner.js
│   ├── .htaccess          # URL rewriting
│   └── index.php          # Front controller
├── .env.example           # Environment template
└── composer.json          # Dependencies & PSR-4 autoloading
```

---

## 🚀 Installation & Setup

### 1. Requirements
- PHP 8.2 or higher (with `pdo_mysql`, `curl`, `json`, `mbstring`, `openssl` extensions)
- MySQL 8.0+ or MariaDB 10.5+
- Composer (optional, autoloader fallback included)
- Apache (with `mod_rewrite`) or Nginx

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` with your MySQL credentials, App Secret, and Google OAuth credentials:
```ini
APP_NAME="Wedding Video Gallery"
APP_ENV=production
APP_URL=https://yourstudio.com
APP_KEY=generate_a_random_32_char_hex_key

DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=wedding_gallery
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourstudio.com/admin/drive/callback
GOOGLE_API_KEY=your-optional-google-api-key
```

### 3. Run Database Migrations & Seeding
From the `php-app` root directory:
```bash
php bin/console migrate
php bin/console seed
```
This creates all 8 tables and seeds the default admin account:
- **Email**: `admin@weddinggallery.com`
- **Password**: `password123`

---

## 🌐 Web Server Configuration

### Apache
Point DocumentRoot to `php-app/public`:
```apache
<VirtualHost *:80>
    ServerName weddings.yourstudio.com
    DocumentRoot /var/www/wedding-gallery/public

    <Directory /var/www/wedding-gallery/public>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### Nginx
```nginx
server {
    listen 80;
    server_name weddings.yourstudio.com;
    root /var/www/wedding-gallery/public;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $realpath_root;
        fastcgi_read_timeout 600;
    }
}
```

---

## ⚙️ Cron & Background Sync

To periodically sync Google Drive changes for all active weddings:
```bash
# Sync specific wedding project ID 1 every hour
0 * * * * php /var/www/wedding-gallery/bin/console sync:drive 1 >> /var/log/wedding_sync.log 2>&1
```

---

## 🔒 Security
- **Encrypted Token Vault**: Google OAuth refresh tokens are encrypted at rest using AES-256-GCM.
- **IDOR Protection**: Video streaming endpoints verify whether the requested video belongs to an active client gallery or authorized photographer.
- **Zero Video Storage**: No media files are kept on local disk, ensuring minimum hosting storage costs and zero duplication.
