export const fallbackContent = {
    label: "Portfolio",
    renderer: "The interactive view couldn't load. Scroll down to explore the portfolio, or get in touch using the contact link above.",
    noJavaScriptBefore: "This website relies heavily on JavaScript. For the full interactive experience, please",
    noJavaScriptAction: "enable JavaScript",
    noJavaScriptAfter: "and refresh the page. Otherwise, simply scroll down to view the most essential information.",
} as const;

export const heroContent = {
    title: "Talha Zobayed",
    subtitle:
        "Building fast interfaces with a designer's eye.",
    professions: ["Frontend Engineer", "3D Visualizer"],
    scrollHint: "Scroll to explore CV",
} as const;

export const headerContent = {
    coordinates: "23.81°N 90.41°E",
    availability: "Available for work",
    themeOptions: ["Light", "Dark"] as const,
    themeSeparator: "/",
    timeZone: "Asia/Dhaka",
    timeZoneLabel: "BST",
    photography: "Photography",
    contact: {
        label: "Contact",
        href: "mailto:talhazobayed7@gmail.com",
    },
} as const;

export type ThemeOption = (typeof headerContent.themeOptions)[number];

export const experienceData = [
    { company: "10 Minute School", position: "Content Executive", duration: "2022 - 2023" },
    { company: "Ostad", position: "Creative Designer", duration: "2023 - 2024" },
    { company: "BRAC", position: "Graphics Design Instructor", duration: "2024 - 2025" },
    { company: "AgriSync.AI", position: "Lead Developer & Strategy Member", duration: "Recent" },
    { company: "Volunteer for Bangladesh (VBD)", position: "Volunteer & Project Lead", duration: "Current" },
    { company: "Quantum School Bangladesh", position: "Quantum Computing Researcher", duration: "Recent" },
    { company: "InnovX", position: "Co-Author & Researcher", duration: "Recent" },
    { company: "Amazon MEX3 Fulfillment Center", position: "Ops Strategy & Analytics Intern", duration: "Recent" },
    { company: "Platformia Times", position: "Contributing Writer", duration: "Current" },
    { company: "eLaundry Bangladesh", position: "Web Designer", duration: "Recent" },
    { company: "RoktoSondhanBD", position: "Developer & Operations Member", duration: "Recent" },
    { company: "TEX Esports", position: "In-Game Leader & Strategist", duration: "Recent" },
] as const;

// Every project owns a folder under /media/projects/<slug>/. `preview` is the
// still the plate shows the moment a row is hovered, authored at 1280x800 to
// match CONFIG.projectPreview.ASPECT; `loop` is an optional muted video that
// takes the plate over once it has a frame to show. The remaining .svg files
// are placeholders — drop a teaser.webp in beside them to replace one.
//
// `slug` and everything under it belong to the case study the row opens: the
// slug is what the URL is rewritten to, and `title` drops the " - Github" the
// row carries for the link, which has no business being the study's headline.
export type CaseStudy = {
    name: string;
    link?: string;
    loop?: string;
    preview: string;
    slug: string;
    title: string;
    role: string;
    year: string;
    stack: string;
    lede: string;
    body: readonly string[];
};

export const projectsData: readonly CaseStudy[] = [
    {
        name: "Portlio - Web Studio",
        link: "https://portlio-rouge.vercel.app",
        preview: "/media/projects/portlio/teaser.webp",
        slug: "portlio",
        title: "Portlio",
        role: "Founder · Design & Engineering",
        year: "2026",
        stack: "Next.js 16 · TypeScript · Tailwind 4 · GSAP · Lenis",
        lede: "Custom personal portfolio websites for students and young creatives.",
        body: [
            "Marketing website for Portlio, a personal portfolio website studio. There are no accounts, dashboards or online payments: every form lands in the team's Google Sheet through an Apps Script webhook, and sales happen by phone.",
            "Built on its own design system, with Lenis smooth scrolling driven from the GSAP ticker and ScrollTrigger scenes: a layered hero collage, a pinned horizontal portfolio strip and a file-mess-to-portfolio scrub.",
            "Statically rendered and fully visible without JavaScript, with SEO built in: discipline pages, guides, a sitemap and JSON-LD, checked by an audit script.",
        ],
    },
    {
        name: "AdmissionMate - Web App",
        link: "https://admissionmate.online",
        preview: "/media/projects/admissionmate/teaser.webp",
        slug: "admissionmate",
        title: "AdmissionMate",
        role: "Full-stack build",
        year: "2026",
        stack: "Next.js · FastAPI · PostgreSQL · Redis",
        lede: "Study tracking for Bangladeshi HSC, SSC and admission-test students.",
        body: [
            "Exam countdowns, a public exam calendar and a per-student study planner, built for students preparing for HSC, SSC and university admission tests in Bangladesh.",
            "A FastAPI backend with async SQLAlchemy, Alembic migrations, PostgreSQL, Redis and APScheduler jobs, with passwordless OTP sign-in and JWT-protected APIs.",
            "Three deployables: the public Next.js app, a separate admin app mounted at /admin through a Vercel rewrite, and the API on Render.",
        ],
    },
    {
        name: "কারেন্ট Koi? - GitHub",
        link: "https://github.com/te9bot/current-nai",
        preview: "/media/projects/current-nai/teaser.svg",
        slug: "current-nai",
        title: "কারেন্ট Koi?",
        role: "Full-stack build",
        year: "2026",
        stack: "React · Vite · FastAPI · PostgreSQL · Leaflet",
        lede: "A community-reported electricity and load-shedding tracker for Bangladesh.",
        body: [
            "People report whether their area currently has power or is in load-shedding, and everyone can browse a live, filterable board of reports on a map.",
            "A public ledger sits behind the board: reports carry the electricity provider and outage duration, and anyone can confirm they are also affected. Aggregate stats and a provider-by-division breakdown show where outage time concentrates.",
            "Fully bilingual in English and Bangla, with a FastAPI and Postgres backend served from a single Docker image.",
        ],
    },
    {
        name: "ELAKAI - Local Services",
        preview: "/media/projects/elakai/teaser.svg",
        slug: "elakai",
        title: "ELAKAI",
        role: "Design & Engineering",
        year: "2026",
        stack: "React · TypeScript · Vite · Supabase · Leaflet · PWA",
        lede: "Trusted local services and emergency contacts for Kushtia, in one place.",
        body: [
            "Hospitals, ambulances, pharmacies, electricians, plumbers and rentals, searchable in Bangla and English.",
            "Installable as a PWA and usable offline, so the numbers are there when the network is not.",
            "There is no server of its own: a static frontend on GitHub Pages talks to Supabase, with Postgres row-level security as the only authorization and an admin panel for managing listings and photos.",
        ],
    },
    {
        name: "Pizza Xpress - Live",
        link: "https://te9bot.github.io/pizza-xpress/",
        preview: "/media/projects/pizza-xpress/teaser.webp",
        slug: "pizza-xpress",
        title: "Pizza Xpress",
        role: "Front-end build",
        year: "2026",
        stack: "HTML · CSS · JavaScript",
        lede: "An interactive pizza-ordering site with a drag-and-drop pizza builder.",
        body: [
            "Drag toppings onto the pizza or tap to add them, with live price and calorie tracking.",
            "A full menu of pizzas, burgers, snacks and drinks, plus a cart, checkout, order confirmation and order tracking flow.",
            "Popular combos load straight into the builder, and the page scrolls by wheel or click-and-drag. A static site with no build step.",
        ],
    },
    {
        name: "Flow Reverse Engineer - Extension",
        preview: "/media/projects/flow-reverse-engineer/teaser.svg",
        slug: "flow-reverse-engineer",
        title: "Flow Reverse Engineer",
        role: "Solo build",
        year: "2026",
        stack: "Chrome Extension · TypeScript · React · Express · Gemini",
        lede: "Point at a video on the web and get back a Google Flow / Veo generation prompt.",
        body: [
            "The extension samples frames across a video's timeline in the browser and detects shot boundaries, then asks Gemini to reconstruct the camera, lighting, composition and motion behind it.",
            "It is not a captioning tool: it rebuilds what a camera operator, gaffer and editor would have done, so a similar shot can be recreated with an AI video generator.",
            "A Manifest V3 extension with a React popup talks to an Express backend that returns a Zod-validated Video DNA, so the Gemini key never reaches the browser and the prompt can be regenerated without redoing the vision pass.",
        ],
    },
    {
        name: "Zulubhai Agency Site - Live",
        link: "https://my-website-mu-umber.vercel.app",
        preview: "/media/projects/eco/teaser.webp",
        slug: "zulubhai",
        title: "zULUBHAI Agency Site",
        role: "Design & Engineering",
        year: "2026",
        stack: "Next.js 16 · React Three Fiber · GSAP · Tailwind 4",
        lede: "A digital studio site covering video, marketing, web and 3D services.",
        body: [
            "A studio platform with a service page for each line, a portfolio with a 3D model viewer, pricing, a blog and an FAQ, all on one design system.",
            "A custom plan calculator prices pooled subscription hours, and a booking scheduler generates time-zone-aware slots and .ics invites. A cart, checkout, client dashboard and admin panel for bookings, orders, coupons and content round it out.",
            "The 3D is lazy-loaded decoration only: visitors on reduced motion, Save-Data, low memory or without WebGL get a static fallback, and every page is real HTML.",
        ],
    },
];

export const PROJECT_PREVIEW_SOURCES = projectsData.map(
    (project) => project.preview,
);

export const PROJECT_LOOP_SOURCES = projectsData.reduce<
    Record<string, string | undefined>
>((sources, project) => {
    if (project.loop) sources[project.preview] = project.loop;
    return sources;
}, {});
export const educationData = [
    {
        institution: "Police Lines School and College",
        degree: "HSC 2024",
        field: "Higher Secondary Certificate, GPA 4.83 / 5.00",
    },
    {
        institution: "Bheramara High School",
        degree: "SSC 2021",
        field: "Secondary School Certificate, GPA 5.00 / 5.00",
    },
] as const;

export const achievementsData: readonly { name: string; link?: string }[] = [
    { name: "2025 / Qiskit Fall Fest Mentor — IBM Quantum" },
    { name: "2023 / Gold Medalist, Physics Olympiad — Ranked #1 of 500+" },
    { name: "2023 / Queen's Commonwealth Essay Gold Award — 19,000+ entries" },
    { name: "2023 / Duke of Edinburgh Silver Award" },
    { name: "2024 / Highest Grade in Higher Mathematics" },
    { name: "2023 / PUBG Mobile Champion — NBL Super League, $2,000" },
    { name: "2023 - Present / 55+ 3D Game Environments" },
];

export const coursesData = [
    { title: "Esports Club Founder", issuer: "College Esports Club", date: "2023" },
    { title: "Art Club President", issuer: "College Art Club", date: "2024" },
    { title: "Debate Club Secretary", issuer: "College Debate Club", date: "2024" },
    { title: "Health Club Founder", issuer: "College Health Club", date: "2023" },
] as const;

export const bioVariants = {
    narrative: [
        "I'm a frontend engineer and data analyst with a visual designer's eye, based in Dhaka, Bangladesh. I build fast, accessible interfaces in React, Next.js and TypeScript, and I turn raw data into dashboards and decisions people can actually read.",
        "My design background, from 3D and motion to brand work for 10 Minute School, Ostad and BRAC, shapes how I build: clear systems, careful detail and interfaces that feel as good as they look. I design and code beautifully simple things, and I love what I do.",
    ],
    manifesto: [
        "I design and code beautifully simple things.",
        "Frontend engineering, data analysis and visual design, end to end.",
        "Data sharpens the decisions, design sharpens the delivery.",
        "Currently available for freelance and full-time work.",
    ],
    facts: [
        "Based in / Dhaka, Bangladesh",
        "Focus / Frontend engineering, data analysis, visual design",
        "Toolkit / React, Next.js, TypeScript, Figma, Blender, Adobe CC",
        "Open to / Freelance and full-time roles",
        "Contact / talhazobayed7@gmail.com",
    ],
} as const;

export const bioImage = {
    src: "/images/talha_bio.jpg",
    alt: "Talha Zobayed Tanim smiling with arms crossed in a striped T-shirt against a blue backdrop",
} as const;

export const profileCardContent = {
    avatarUrl: bioImage.src,
    name: heroContent.title,
    title: "Frontend Engineer & Data Analyst",
    handle: "talhazobayed7",
    status: headerContent.availability,
    contactText: headerContent.contact.label,
    contactHref: headerContent.contact.href,
} as const;

export type PhotoBookPhoto = {
    src: string;
    title: string;
    chapter: string;
    description: string;
    alt: string;
};

const photo = (
    file: string,
    chapter: string,
    title: string,
    description: string,
    alt: string,
): PhotoBookPhoto => ({ src: `/photography/${file}.webp`, chapter, title, description, alt });

export const photographyContent = {
    heading: "Photography",
    intro: [
        "Photography is my favorite habit. Fog over the Padma, a farmer in a wet field, the last boat home at dusk: twenty-five frames from around home, bound into one small book.",
        "Open it and turn the pages.",
    ],
    bookTitle: "My Favorite Habit",
    bookSubtitle: "A photo book",
    photographer: heroContent.title,
    byline: `Photographs by ${heroContent.title}`,
    openLabel: "Open the book",
    foreword: [
        "I never planned to become a photographer. I just kept stopping: for fog sitting on the river, for light coming through leaves, for a boat crossing at the exact moment the sky turned orange.",
        "Most of these frames were made around Bheramara, along the Padma and its bridges, on mornings I should have been asleep and evenings I should have been home.",
        "Photography taught me to look twice. That second look is what I bring to everything I design and build.",
    ],
    closing: [
        "Thank you for turning the pages.",
        "The habit continues. There is always another morning with fog on the river.",
    ],
    photos: [
        photo("03", "Morning Fog", "Into the White", "The Lalon Shah Bridge walking into winter fog over the Padma. One small boat underneath is the only thing moving, and the far bank simply isn't there.", "A long concrete bridge disappearing into thick fog above a river, a small boat below"),
        photo("02", "Morning Fog", "Two Bridges", "The red steel of the Hardinge Bridge and the Lalon Shah Bridge behind it, framed by leaves. A boatman crosses the teal water between a century of engineering.", "A red truss railway bridge and a second bridge in fog, framed by green leaves over teal water"),
        photo("17", "Morning Fog", "The Commute", "A cyclist rides an old concrete bridge into the mist. I stood still and let him go until the fog almost took him.", "A man cycling away across a narrow concrete bridge into fog"),
        photo("13", "Morning Fog", "Still Water", "Fog resting on a wetland while water lilies open in the clear shallows. All the colour comes from the water, none from the sky.", "Misty wetland with clear green water and white water lilies"),
        photo("19", "Morning Fog", "The Way Home", "A dirt path between trees and rice fields, the early haze turning gold. Every village has a path like this, and I never get tired of them.", "A dirt path through trees beside green fields in golden morning haze"),
        photo("20", "Morning Fog", "Lone Tree", "One tree on the horizon and a field of young paddy in front of it. I got down into the grass so the tree could stand tall.", "A single round tree on the horizon behind a field of young green rice"),
        photo("14", "Morning Fog", "Hyacinth Season", "Water hyacinth in full bloom, and a half-built building fading out behind the trees. The city and the marsh, side by side.", "A marsh covered in purple water hyacinth flowers with a hazy building behind"),
        photo("22", "Morning Fog", "Light Through Leaves", "Sunlight cutting through the canopy in long beams. You get about five minutes of this before the light flattens out.", "Sunbeams streaming through dense green tree branches"),
        photo("08", "Daylight", "Field Work", "A farmer and his buffalo working a flooded field, framed through the arch of an old tree. Patience on both sides of the lens.", "A farmer with two buffalo in a wet field, seen through a gap in a tree trunk"),
        photo("04", "Daylight", "Old Iron, New Power", "The Hardinge Bridge in front of the cooling towers at Rooppur. A hundred years of change in one frame.", "Cooling towers behind a red truss bridge across a blue river under a bright sky"),
        photo("12", "Daylight", "Inside the Truss", "Between the rails inside the Hardinge Bridge, the red steel repeats until it becomes a tunnel. Symmetry does all the work here.", "Railway tracks running through the red steel truss of a bridge in perfect symmetry"),
        photo("10", "Daylight", "Arches", "The vaulted shells of Kamalapur station, travellers walking toward the light at the far end. A building that frames everyone who passes through it.", "People walking under the repeating concrete arches of a railway station"),
        photo("11", "Daylight", "Riverside Break", "A man resting on a riverside railing, phone in hand, under bougainvillea and beside a hand-painted pillar. A quiet minute in a loud day.", "A man sitting on a railing by a river, beneath pink bougainvillea, next to a colourfully painted pillar"),
        photo("01", "Daylight", "Watching the River", "A father and child on a bamboo platform looking out over the water, with a few mynas keeping them company.", "A man holding a child on a wooden platform under a bamboo shed, birds perched nearby"),
        photo("05", "Daylight", "Bougainvillea", "Pink bougainvillea pushing through a wall of green. I shot this one for the colour and nothing else.", "Pink bougainvillea flowers scattered through dense green foliage"),
        photo("09", "Daylight", "Afloat", "A white gerbera and soft pink roses resting on dark water. Still life, found rather than arranged.", "A white gerbera and pink roses floating on dark water among leaves"),
        photo("07", "Daylight", "Moored", "Two wooden boats from above, resting in water thick with duckweed. Seen from the bank they were ordinary; from up here they became shapes.", "Two wooden boats seen from above on dark water covered in green duckweed"),
        photo("15", "Daylight", "Corner Table", "A café bookshelf glowing under warm lamps. Not every frame needs a river; sometimes it is just a good corner to sit in.", "A warmly lit café with a wooden bookshelf, plants and chairs"),
        photo("18", "Golden Hour", "Dewdrop Sun", "The setting sun balanced inside a drop hanging from a blade of grass. It took a lot of patience, very close to the ground, to line it up.", "A dewdrop on a blade of grass holding the glowing sun against an amber sky"),
        photo("16", "Golden Hour", "Padma Sunset", "Fishing boats heading home across the Padma, with the Rooppur towers resting on the horizon.", "Small boats on a wide river at sunset with cooling towers on the far shore"),
        photo("06", "Golden Hour", "Lilies at Dusk", "White water lilies opening on a pond while pink clouds float between the pads.", "White water lilies among green pads, pink evening clouds reflected in the water"),
        photo("21", "Blue Hour", "Reflection", "A boat resting at the edge of flooded fields at blue hour. Its reflection is sharper than the boat itself.", "A wooden boat and its mirror reflection in still blue water at twilight"),
        photo("24", "Blue Hour", "Last Crossing", "Two boatmen rowing home as the sky turns from orange to blue.", "Two men rowing a wooden boat on a river under an orange and blue sunset sky"),
        photo("23", "Blue Hour", "Friends on the Bow", "Friends sitting on the edge of a boat, feet over the water, while the evening clouds turn pink.", "Silhouettes of friends sitting on the bow of a boat over the river at dusk"),
        photo("25", "Blue Hour", "Homeward", "A boat full of silhouettes crossing under a burning sky. The last frame of the day, and my favourite way to end one.", "A boat with silhouetted passengers crossing a river beneath a fiery orange sunset"),
    ],
} as const;

export type BioVariant = keyof typeof bioVariants;

export const DEFAULT_BIO_VARIANT: BioVariant = "narrative";

export const bioData = bioVariants[DEFAULT_BIO_VARIANT];

export const projectLinkContent = {
    caseStudy: "Open case study",
    liveSite: "Visit live site",
} as const;

export const skillsData = [
    "Visual Design",
    "3D Design & Modeling",
    "Motion Graphics",
    "Blender",
    "Substance Painter",
    "Unreal Engine",
    "Photoshop",
    "Illustrator",
    "Figma",
    "Premiere Pro",
    "After Effects",
    "Lightroom",
] as const;
