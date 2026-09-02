🚀 PostX
Social • Marketplace • Chat • Publishing • Boost
PostX is a Progressive Web App (PWA) by ThinkPlus that brings social publishing, discovery, marketplace commerce, communication, and advertising into one connected platform.
Create once. Post everywhere. Connect. Sell. Boost.
🌐 Product Vision
PostX is not just a social-media scheduler.
PostX is being built as a connected platform combining:
POSTX
                           │
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
      SOCIAL            MARKETPLACE         CHAT
        │                  │                  │
  PostX + FB + IG      Products/Services   PostX Users
        │                  │                  │
        │                  │          External Channels
        └──────────────┬───┴──────────────────┘
                       ↓
                     BOOST
                       │
               Pay to reach more people
                       │
                     M-PESA
The platform connects:
Content → Discovery → Communication → Marketplace → Advertising → Growth
🔁 The PostX Business Loop
BUSINESS
   ↓
FREE PRODUCT POST
   ↓
DISCOVERY
   ↓
CUSTOMER
   ↓
MESSAGE SELLER
   ↓
SALE / LEAD
   ↓
BOOST
   ↓
M-PESA
   ↓
MORE REACH
   ↓
MORE MESSAGES
   ↓
MORE SALES
   ↓
BOOST AGAIN
This connected loop is one of the central ideas behind PostX.
📱 Progressive Web App
PWA-First Architecture
PostX is a PWA-first application.
The PWA is the main user-facing application.
PostX is designed to work across:
Android
iPhone / iPad
Windows
macOS
Linux
Modern mobile browsers
Modern desktop browsers
Users should be able to access PostX through a browser and install it as an application on supported devices.
PWA foundation
PostX/
│
├── index.html
├── feed.html
├── inbox.html
├── settings.html
├── manifest.json
├── sw.js
│
├── css/
│   ├── style.css
│   ├── feed.css
│   └── inbox.css
│
├── js/
│   ├── app.js
│   ├── composer.js
│   ├── feed.js
│   ├── inbox.js
│   └── settings.js
│
├── assets/
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
│
└── README.md
The PWA provides the interface.
The secure backend will eventually provide the infrastructure behind the application.
🧩 Core PostX Experiences
PostX is centered around seven major experiences:
🏠 Social Hub
📤 Post Everywhere
🆓 Free Posts
🚀 Boost
🏪 Marketplace
💬 Unified Inbox
⭐ PostX Pro
1. 🏠 Social Hub
The Social Hub is PostX's main social discovery experience.
It is not video-only.
The Social Hub should support all supported PostX content types.
Supported content
📷 Photo posts
🎥 Video posts
📝 Text-only posts
🏪 Product posts
🛠️ Service posts
🚀 Boosted posts
📍 Location-based posts
#️⃣ Hashtag-based posts
🔗 Shared content where supported
Users can filter content by source:
POSTX

[ ALL ] [ POSTX ] [ FACEBOOK ] [ INSTAGRAM ]
Example Photo Post
┌──────────────────────────────┐
│ 👤 Business                  │
│                              │
│ 📷 Product photo             │
│                              │
│ "New shoes available."       │
│                              │
│ 📍 Kilifi                    │
│ #Shoes #Kenya                │
│                              │
│ ❤️ 24   💬 7   ↗ 3           │
└──────────────────────────────┘
Example Video Post
┌──────────────────────────────┐
│ 👤 Creator                   │
│                              │
│ 🎥 Product video             │
│                              │
│ "Check this out..."          │
│                              │
│ ❤️ 18   💬 4   ↗ 2           │
└──────────────────────────────┘
Example Text Post
┌──────────────────────────────┐
│ 👤 User                     │
│                              │
│ 📝 Good morning PostX!       │
│                              │
│ ❤️ 8   💬 2                  │
└──────────────────────────────┘
Example Marketplace Post
┌──────────────────────────────┐
│ 🏪 Business                  │
│                              │
│ 📷 Product                  │
│                              │
│ Nike Shoes                  │
│ KSh 2,500                   │
│                              │
│ 📍 Mombasa                  │
│                              │
│ [ MESSAGE SELLER ]          │
│                              │
│ ❤️ 24   💬 7                │
└──────────────────────────────┘
Social Actions
Where supported by PostX or external platform APIs, users may be able to:
❤️ Like / React
💬 Comment
↩️ Reply
↗️ Share
👁 View
📥 Open conversation
🏪 Open product
💬 Message seller
🚀 Boost eligible content
PostX aims to become a social control center, not simply an imported-content viewer.
External actions depend on each platform's official APIs, permissions, and capabilities.
2. 📤 Post Everywhere
PostX provides one unified composer.
Composer
📸 PHOTO / 🎥 VIDEO
        +
✍️ CAPTION
        +
📍 LOCATION
        +
📝 TEXT
        +
#️⃣ HASHTAGS
Users can select supported destinations:
☑ PostX
☑ Facebook
☑ Instagram
Then:
[ POST EVERYWHERE ]
With connected accounts, PostX can publish to supported external platforms.
External publishing will use:
Official APIs
OAuth
User authorization
Required permissions
Secure access tokens
Platform publishing endpoints
PostX will never pretend an external integration exists when the required API access has not been implemented.
3. 🆓 Free Posts
Regular PostX social posts are free.
Users can create:
FREE POST

📷 Photo
OR
🎥 Video
OR
📝 Text

+
Caption
+
Location
+
Hashtags
Free posts can appear in the PostX Social Hub without requiring payment.
Example:
👁 Viewed 37
❤️ 8 likes
💬 4 messages
PostX should record real activity.
Production analytics must never rely on fake values such as:
Math.random()
Views, likes, comments, shares, messages, and other metrics must come from actual recorded events or verified external-platform metrics.
4. 🚀 Boost
Boost is the PostX advertising and growth engine.
A user or business can publish organically and then choose:
Want more people to see it? BOOST IT.
Example:
🚀 BOOST THIS POST

Location

Kilifi       KSh 30
Mombasa      KSh 80
Kwale        KSh 80

Duration

[ 24 HOURS ]
[ 3 DAYS ]
[ 7 DAYS ]

[ BOOST NOW ]
Boost Supports
📷 Photos
🎥 Videos
📝 Eligible text/product content
📍 Location targeting
⏱ Campaign duration
💰 Paid promotion
📊 Campaign analytics
🔔 Campaign notifications
Boosted content must display an appropriate:
Sponsored / Ad
label.
5. 📊 Boost Analytics
Advertisers should see measurable campaign performance.
Example:
🚀 YOUR BOOST IS ACTIVE

Your product:

[ IMAGE ]

Views
1,284 👁

Likes
96 ❤️

Comments
21 💬

Messages
14 💬

Boost remaining
18 HOURS
PostX can notify the advertiser:
🔔 Your Boost has reached 1,284 views.
The objective is to show the advertiser the actual value generated by their campaign.
PostX must never fabricate:
Views
Likes
Comments
Shares
Messages
Reach
Impressions
6. 📅 Scheduling & Autopost
PostX supports scheduled publishing.
POST EVERYWHERE

[ Photo / Video ]

Caption...

☑ PostX
☑ Facebook
☑ Instagram

○ Post now
○ Schedule

Date: 02/09/2026
Time: 08:00 PM

[ SCHEDULE ]
⭐ Premium Autopost
Automatic scheduled publishing is a PostX Pro / Premium feature.
The backend scheduler will eventually:
Store the scheduled post.
Validate connected accounts.
Wait until the scheduled time.
Publish through supported official APIs.
Record the publishing result.
Report success or failure.
Update publishing history.
7. 🏪 Marketplace
PostX includes a marketplace for businesses and sellers.
Business users can create catalogs.
🏪 MY CATALOG

Nike Shoes
KSh 2,500

Samsung A15
KSh 18,000

Men's Shirts
KSh 1,200
Catalog items may contain:
Product name
Service name
Description
Price
Images
Video
Location
Category
Availability
Seller information
Customers can select:
[ MESSAGE SELLER ]
This connects marketplace discovery directly to PostX communication.
8. 💬 Unified Inbox
PostX provides a central communication experience.
📥 INBOX

[ ALL ] [ POSTX ] [ WHATSAPP ]
[ MESSENGER ] [ INSTAGRAM ]

Mary
PostX

"Is the blue one available?"

John
WhatsApp

"How much?"

Sarah
Instagram

"Can I order?"

Peter
Messenger

"Where are you located?"
PostX Native Chat
PostX users can message other PostX users directly.
Native PostX messaging is a core part of the platform.
External Messaging
Future integrations may include:
WhatsApp
Facebook Messenger
Instagram messaging
Other supported communication channels
External messaging depends on each platform's official APIs, account types, permissions, and available capabilities.
PostX will implement these integrations properly rather than simulating external communication.
9. ⭐ PostX Pro
PostX uses a freemium business model.
🆓 Free
The free experience provides access to core social functionality.
Potential features:
PostX posts
Photo posting
Video posting
Text posts
Captions
Location
Hashtags
Social Hub
Basic engagement
Basic account functionality
⭐ PostX Pro
KSh 49 / month
Potential Pro benefits:
✅ Scheduled autoposting
✅ Advanced publishing controls
✅ Post Everywhere
✅ Higher usage limits
✅ Advanced insights
✅ Additional connected accounts
✅ Premium AI features
✅ Lower Boost pricing where applicable
✅ Reduced/removal of advertising where applicable
Final pricing, limits, and entitlements will be controlled by the backend.
10. 💰 M-PESA
M-PESA will be an important payment method for PostX in Kenya.
Boost Payment
BUSINESS
   ↓
BOOST
   ↓
SELECT CAMPAIGN
   ↓
M-PESA
   ↓
PAYMENT CONFIRMED
   ↓
CAMPAIGN ACTIVATED
Pro Payment
POSTX PRO
   ↓
KSh 49 / month
   ↓
M-PESA
   ↓
PAYMENT CONFIRMED
   ↓
PRO ACTIVATED
Payment processing will be handled by the secure backend.
The frontend must never contain:
M-PESA secrets
API credentials
Private keys
Payment callback secrets
The backend will handle:
Payment requests
Payment callbacks
Transaction validation
Payment records
Subscription entitlement
Boost activation
Payment status
Failed payments
🔁 Marketplace + Chat + Boost
The major PostX product connection is:
PRODUCT
   ↓
POST
   ↓
SOCIAL DISCOVERY
   ↓
CUSTOMER
   ↓
MESSAGE SELLER
   ↓
LEAD / SALE
   ↓
BOOST
   ↓
MORE DISCOVERY
This turns PostX into more than a publishing tool.
🏗️ System Architecture
POSTX PWA
                            │
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
          Composer       Social Hub     Inbox
              │             │             │
              └─────────────┼─────────────┘
                            ↓
                       BACKEND API
                            │
       ┌────────────────────┼────────────────────┐
       ↓                    ↓                    ↓
    Database            Background Jobs       Services
       │                    │                    │
       ↓                    ↓                    ↓
    Accounts            Scheduling             AI
    Posts               Autopost               Analytics
    Products            Boost Jobs             Notifications
    Messages
       │
       ├────────────────────┐
       ↓                    ↓
   Social APIs           Payments
   FB / IG                M-PESA
🔐 Backend Responsibilities
The backend will eventually handle:
Authentication
User accounts
Business accounts
Authorization
Database
Social OAuth
Access tokens
Publishing
Scheduling
Background jobs
Analytics
Boost campaigns
Marketplace
Messaging
Notifications
Payments
Subscriptions
AI services
Security
Audit logging
The PWA remains the primary user-facing application.
🔌 Social Integrations
Initial External Platforms
Facebook Pages
Instagram Professional accounts
Future Integrations
TikTok
WhatsApp
WhatsApp Channels
LinkedIn
X
Additional supported platforms
All integrations must use official APIs and comply with the relevant platform's requirements.
🤖 AI
Future AI capabilities may include:
Caption generation
Caption rewriting
Hashtag suggestions
Call-to-action suggestions
Content ideas
Multiple caption variations
AI content assistance
AI Autopilot
AI credentials and API keys will be handled by the backend.
📈 Analytics
PostX analytics may include:
Social
Views
Reach
Likes
Comments
Shares
Engagement
Publishing
Published posts
Scheduled posts
Failed posts
Connected accounts
Marketplace
Product views
Seller messages
Leads
Orders where supported
Boost
Views / impressions
Likes
Comments
Shares
Messages
Campaign duration
Cost
Performance
All production analytics must represent measurable activity.
🎨 Design System
PostX uses the approved original PostX visual identity.
Brand
Original PostX logo/icon
Dark navy / black foundation
Neon cyan accent
UI
Premium SaaS appearance
Subtle cyan glow
Lighter navy cards
Soft white/light-gray typography
Clear status colors
Touch-friendly controls
Clean responsive layouts
Restrained neon usage
PostX supports:
🌙 Dark Mode
☀️ Light Mode
The original PostX icon and core brand identity must be retained.
📱 PWA Requirements
The PostX PWA should provide:
Responsive design
Mobile-first interface
Desktop responsiveness
Installability
Web App Manifest
Service Worker
Offline caching where appropriate
Touch-friendly controls
App-like navigation
Secure HTTPS deployment
Fast loading
Responsive layouts
📁 Project Structure
PostX/
│
├── index.html              # PostX Composer / Home
├── feed.html               # Social Hub
├── inbox.html              # Unified Inbox
├── settings.html           # Settings
│
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── README.md
│
├── css/
│   ├── style.css
│   ├── feed.css
│   └── inbox.css
│
├── js/
│   ├── app.js
│   ├── composer.js
│   ├── feed.js
│   ├── inbox.js
│   └── settings.js
│
└── assets/
    └── icons/
        ├── icon-192.png
        └── icon-512.png
The structure will expand as backend services are introduced.
🗺️ Development Roadmap
Phase 1 — PWA Foundation
Responsive UI
PostX branding
Navigation
Web App Manifest
Service Worker
Installable PWA
Dark/light settings
Status: 🚧 In Development
Phase 2 — Social Hub
PostX feed
Photo posts
Video posts
Text posts
Product posts
Service posts
Feed filters
Post cards
Likes
Comments
Views
Sharing
PostX-native interactions
Status: 🔜 Planned
Phase 3 — Universal Composer
Photo upload
Video upload
Text
Caption
Location
Hashtags
Platform selection
Free PostX publishing
Drafts
Status: 🔜 Planned
Phase 4 — Publishing
Post Everywhere
Facebook integration
Instagram integration
OAuth
Publishing status
Error handling
Publishing history
Status: 🔜 Planned
Phase 5 — Scheduling
Scheduled posts
Calendar
Edit scheduled posts
Delete scheduled posts
Background scheduler
Autopost
Scheduled status
Premium Feature
Phase 6 — Marketplace
Business accounts
Business catalogs
Products
Services
Product posts
Seller profiles
Message Seller
Status: 🔜 Planned
Phase 7 — Unified Inbox
PostX chat
Conversations
Messages
Notifications
Facebook Messenger
Instagram messaging
WhatsApp integration
Status: 🔜 Planned
Phase 8 — Boost
Image Boost
Video Boost
Location targeting
Campaign duration
Sponsored labels
Campaign tracking
Real views
Engagement
Messages
Notifications
Status: 🔜 Planned
Phase 9 — Payments
M-PESA
Boost payments
Pro subscriptions
Payment confirmation
Transaction history
Entitlements
Status: 🔜 Planned
Phase 10 — Analytics & AI
Advanced analytics
Campaign reports
AI captions
Hashtag suggestions
Caption rewriting
Content ideas
Status: 🔜 Planned
Phase 11 — Growth
Future capabilities:
TikTok
WhatsApp Channels
LinkedIn
X
Team accounts
Agency accounts
Advanced analytics
AI Autopilot
White-label solutions
International expansion
🔒 Security Principles
PostX will:
Never expose API secrets in frontend code.
Never store payment secrets in the PWA.
Use secure OAuth.
Protect user sessions.
Secure access tokens.
Validate API requests.
Apply authorization controls.
Isolate customer data.
Protect business data.
Maintain audit logs.
Use HTTPS.
Follow external platform API requirements.
🎯 Target Users
PostX is designed for:
Small businesses
Online sellers
Creators
Freelancers
Service providers
Social-media managers
Marketing professionals
Digital agencies
Growing brands
Individual users
🇰🇪 Initial Market
PostX is initially focused on:
Kenya 🇰🇪 and Africa 🌍
The architecture is designed for international expansion.
💼 Business Model
PostX can generate revenue through:
POSTX REVENUE
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
      BOOST          POSTX PRO        BUSINESS
        │                │                │
      M-PESA          KSh 49/mo       Future Plans
Potential future revenue streams:
Boost campaigns
PostX Pro subscriptions
Business plans
Agency plans
AI credits
Advertising
Marketplace services
White-label solutions
The goal is to keep core social participation accessible while creating sustainable recurring revenue.
🧠 Development Principles
1. PWA First
The PostX PWA is the primary frontend experience.
2. Backend Ready
Frontend interfaces should be designed around APIs that can later connect to the real backend.
3. Real Data
Production metrics must come from real events or verified external API data.
4. Official Integrations
External platforms must be integrated through official APIs and permissions.
5. Secure Payments
M-PESA and subscription logic must remain on the backend.
6. Modular Architecture
Social, Marketplace, Chat, Publishing, Boost, Payments, and Analytics should be developed as connected but modular systems.
🔄 Production Data Flow
PWA
 ↓
Secure API
 ↓
Backend
 ↓
Database
 ↓
Background Jobs
 ↓
External APIs / M-PESA
 ↓
Verified Result
 ↓
PWA
The production system must not depend on:
Fake publishing
Fake payments
Fake analytics
Random views
Random likes
Simulated external-platform actions
🚧 Current Project Status
PostX — MVP In Development 🚧
Current priority:
PWA foundation
PostX Composer
Social Hub
PostX-native interactions
Marketplace foundation
Unified Inbox foundation
Boost UI
Backend API architecture
Official social integrations
M-PESA
PostX Pro
🇰🇪 ThinkPlus
PostX is a product of ThinkPlus.
ThinkPlus builds practical digital products designed to solve real-world business and technology problems.
👨‍💻 Author
Joseph Mbui
Founder — ThinkPlus
GitHub: @Jose-ctr
📄 License
License will be defined before the first production release.
🚀 POSTX
Create once. Post everywhere. Connect. Sell. Boost.
Social + Marketplace + Chat + Publishing + Advertising
Built by ThinkPlus 🇰🇪
