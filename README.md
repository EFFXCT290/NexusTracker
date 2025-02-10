# ■ sqtracker

[![License GPLv3](https://badgen.net/badge/license/GPLv3/blue)](./LICENSE)

sqtracker is a modern private BitTorrent tracker platform.

It implements all of the features required to run a private (or public) tracker and does not focus on any one specific type of content. It is suitable for running a tracker site of any kind.

Please make an issue for support.

## Features

* Accounts
  * Registration modes (open / closed / invite only)
  * Sending of invites
  * Account management (2FA, password resets etc.)
  * Bonus points system (purchase invites, upload etc.)
  * Option to browse torrents without logging in (for search engine discovery)
* Torrent management
  * Uploading torrents with rich metadata (title, description, source, mediainfo, category, tags etc.)
  * Searching torrents or browsing by category or tags
  * Freeleech options (specific torrents, site-wide)
  * Torrent grouping (e.g. different formats of same movie)
  * Bookmarks
* Upload / download tracking
  * Track how much content each user has uploaded / downloaded
  * Track ratios
  * Track hit'n'runs
  * Limit downloading per user based on ratio, HnRs, or both
  * Award bonus points based on upload
* User interaction
  * Commenting on torrents and announcements
  * Up / down voting torrents
  * Requests system
* Moderation
  * Staff / admin privileges
  * Reporting torrents to be reviewed by staff
  * Detailed stats available to admins
  * Wiki system
  * Announcements / news posts
  * Ban / unban users
* Tracker appearance
  * Configurable theme / CSS
  
## Configuration

All configuration is provided via a single JavaScript file named `config.js`. This file must export an object containing 2 keys: `envs` and `secrets`.

The configuration can be found in `config.js`. This file contains examples and explanations for each config value.

If your configuration is not valid, sqtracker will fail to start.

### The initial admin user

On first start up, sqtracker will create a user named `admin` with the password `admin`. A confirmation email will be sent to the admin email address you specified in your config file. Once logged in for the first time, you should change the admin password immediately. This admin user can be used to send other admin invites (normal accounts cannot send admin invites). This user cannot be deleted/banned.

## Deploying

### Components

An sqtracker deployment is made up of 4 separate components. These are:

#### 1. The sqtracker API service

The sqtracker API service handles all actions taken by users (authentication, uploads, searching etc.), implements the BitTorrent tracker specification to handle announces and scrapes, and provides the RSS feed. 

#### 2. The sqtracker client service

The sqtracker client service provides the modern, responsive web interface that users interact with.

#### 3. A MongoDB database

[MongoDB](https://www.mongodb.com/) is a popular and powerful document-oriented database. Version 5.2 or higher is required.

#### 4. A HTTP proxy server

The HTTP proxy allows the client, API, and BitTorrent tracker to all be accessible via a single endpoint.

An Nginx config file is provided and the `docker-compose.yml` file contains an Nginx block 

### Deploying The Tracker
First you should make the MongoDB DataBase.
Here is a docker-compose.yml for the MongoDB DataBase
```bash
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - /home/MongoDB:/data/db
    restart: always # Automatically restart the container if it crashes
    environment: #optional configuration
      MONGO_INITDB_ROOT_USERNAME: "root" #set root username
      MONGO_INITDB_ROOT_PASSWORD: "PS5pl@yer72@" #set root password
    command: [--auth]  # This is ESSENTIAL for authentication
```
Next You should check if the MongoDB is working by going to `ipaddress:27017`

After you check is working mongosh into it using
```bash
mongosh -u [username set on docker-compose.yml] 
```
Then type your password set on ```docker-compose.yml``` and you should be in

Then create the DataBase
```bash
use sqtracker
```
After that create the user that will be in charge of that DB
```bash
db.createUser({
  user: "username",
  pwd: "password",
  roles: [{ role: "dbOwner", db: "sqtracker" }]
})
```
After that is done check the users. The user you just created should appear.
```bash
show users
```
Then docker exec into the mongodb container
```bash
docker exec -it "containerid" bash
```
Update the container and install nano
```bash
apt update && apt install nano
```
CD into the directory /etc and then nano into mongod.conf.orig file
```bash
sudo nano /etc/mongod.conf
```
Then edit the conf file in the bind address which says `127.0.0.1` to `0.0.0.0` to make the DB available remotely and in the `security:` section add `  authorization: enabled` under it. It should look like this
```bash
security:
  authorization: enabled
```
After that you have successfuly made a mongoDB database. Restart the container to commit the changes and you are done with MongoDB

After you have the MongoDB made Update the config.js file with the preferences you want.

And that's it use `docker compose up -d` to run the `docker-compose.yml` and you can visit your new tracker at `ipaddress:80` 

## Adding a translation

New translations are always appreciated!

To add a new translation in your own language, create a new JSON file with your 2 character locale code in `client/locales`. For example, `client/locales/en.json`. In the `client/locales/index.js` file, you should then import your JSON file and add it to the exported object along with the existing locales.

The best place to start is to copy the `en.json` file and work through it, translating each English string.

There is also an [inlang project](https://fink.inlang.com/github.com/tdjsnelling/sqtracker) to aid with translation.

### Existing translations

| Language           | Contributed by                                       |
|--------------------|------------------------------------------------------|
| English            |                                                      |
| Russian            | [@smlinux](https://github.com/smlinux)               |
| Esperanto          | [@smlinux](https://github.com/smlinux)               |
| German             | [@EchterAlsFake](https://github.com/EchterAlsFake)   |
| Simplified Chinese | [@0EAC](https://github.com/0EAC)                     |
| French             | [@Klaiment](https://github.com/Klaiment)             |
| Spanish            | [@CerealKillerjs](https://github.com/CerealKillerjs) |
| Italian            | [@NotLugozzi](https://github.com/NotLugozzi)         |

## Screenshots

Splash screen
<img width="1663" alt="splash" src="https://user-images.githubusercontent.com/6264509/218762121-e7800d27-c5f1-4288-ba6e-f33c235b9b27.png">

Home
<img width="1707" alt="home" src="https://user-images.githubusercontent.com/6264509/218762088-e604d1d6-7f6a-4910-b7ff-500e0e762056.png">

Torrent
<img width="1707" alt="torrent" src="https://user-images.githubusercontent.com/6264509/218762124-70d00f99-287a-4efa-90ed-47db7a0be39b.png">

Upload
<img width="1707" alt="upload" src="https://user-images.githubusercontent.com/6264509/218762133-0a359ca0-6a18-4440-80f6-6d28adba1a6f.png">

Categories
<img width="1707" alt="categories" src="https://user-images.githubusercontent.com/6264509/218762073-b1d42889-2868-414e-af60-9fe75ba48ee1.png">

Profile
<img width="1663" alt="profile" src="https://user-images.githubusercontent.com/6264509/218762104-238c90ab-c144-42f1-869e-bbae120f556f.png">

Account
<img width="1663" alt="account" src="https://user-images.githubusercontent.com/6264509/218762053-90667723-db6e-473c-8ae0-11bc635f322e.png">

Announcement
<img width="1663" alt="announcement" src="https://user-images.githubusercontent.com/6264509/218762065-e91ca084-1f9a-4af5-9232-291d87625c7a.png">

Request
<img width="1663" alt="request" src="https://user-images.githubusercontent.com/6264509/218762116-38cf1b95-7c76-4476-9276-19f6c77c2c9a.png">

Report
<img width="1707" alt="report" src="https://user-images.githubusercontent.com/6264509/218762109-b76bd5f1-b333-4d09-9c9a-e2fa87b3c2de.png">

## Contributing

Pull requests are welcome! If you fork sqtracker and think you have made some improvements, please open a pull request so other users deploying sqtracker from this repository can also get the benefits.

Please see the [CONTRIBUTING](./CONTRIBUTING.md) document for guidance on code style etc.

## License

GNU GPLv3
