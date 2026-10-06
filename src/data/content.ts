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
        "Specialized in 3D design and visual storytelling.",
    professions: ["Creative Designer", "3D Visualizer"],
    scrollHint: "Scroll to explore CV",
} as const;

export const headerContent = {
    coordinates: "23.81°N 90.41°E",
    availability: "Available for work",
    themeOptions: ["Light", "Dark"] as const,
    themeSeparator: "/",
    timeZone: "Asia/Dhaka",
    timeZoneLabel: "BST",
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
const projectsList = [
    {
        name: "Lakeside Cabin at Sunrise - 3D",
        preview: "/media/projects/lakeside-cabin/teaser.webp",
        slug: "lakeside-cabin",
        title: "Lakeside Cabin at Sunrise",
        role: "Cinematic 3D Environment",
        year: "2025",
        stack: "Blender · Substance Painter",
        lede: "Tranquil lakeside setting with soft sunlight and gentle fog.",
        body: [
            "A cinematic environment built around one quiet moment: the first light of the day settling over still water, with fog softening everything beyond the cabin.",
            "Part of an ongoing series of more than 55 3D game environments and assets created since 2023.",
        ],
    },
    {
        name: "Forest Water Surface Study - 3D",
        preview: "/media/projects/forest-water-surface/teaser.webp",
        slug: "forest-water-surface",
        title: "Forest Water Surface Study",
        role: "Environmental Realism",
        year: "2025",
        stack: "Blender · Substance Painter",
        lede: "Realistic shallow-water simulation with dynamic ripples and natural reflections.",
        body: [
            "A study of shallow forest water featuring dynamic ripples, natural reflections, and dense submerged vegetation.",
            "The focus is material accuracy and environmental detail, getting water to read as water at every depth.",
        ],
    },
    {
        name: "Forest Clearing at Morning Light - 3D",
        preview: "/media/projects/forest-clearing/teaser.webp",
        slug: "forest-clearing",
        title: "Forest Clearing at Morning Light",
        role: "3D Nature Simulation",
        year: "2025",
        stack: "Blender · Substance Painter",
        lede: "A quiet woodland scene where early sunlight filters through tall pines.",
        body: [
            "Lush green undergrowth covers the forest floor, and an old wooden barrel sits partially hidden among the plants, suggesting a forgotten human presence.",
            "The atmosphere feels calm and untouched, with gentle light and subtle shadows creating a peaceful, almost cinematic mood.",
        ],
    },
    {
        name: "Snowy Night House - 3D",
        preview: "/media/projects/snowy-night-house/teaser.webp",
        slug: "snowy-night-house",
        title: "Snowy Night House",
        role: "Stylized 3D Illustration",
        year: "2025",
        stack: "Blender",
        lede: "Winter night scene with warm interior lighting.",
        body: [
            "A stylized winter night where cold blue snow meets the warm glow spilling from the windows.",
        ],
    },
    {
        name: "Countryside Cottage (Autumn) - 3D",
        preview: "/media/projects/countryside-cottage/teaser.webp",
        slug: "countryside-cottage",
        title: "Countryside Cottage (Autumn)",
        role: "Realistic 3D Environment",
        year: "2025",
        stack: "Blender · Substance Painter",
        lede: "Rustic countryside house with detailed autumn textures.",
        body: [
            "A realistic rural cottage dressed in autumn, built around detailed, weathered textures and seasonal colour.",
        ],
    },
    {
        name: "Planetary Space Scene - 3D",
        preview: "/media/projects/planetary-space-scene/teaser.webp",
        slug: "planetary-space-scene",
        title: "Planetary Space Scene",
        role: "Sci-Fi 3D Environment",
        year: "2025",
        stack: "Blender",
        lede: "Cinematic depiction of a distant planet with atmospheric glow.",
        body: [
            "A sci-fi environment study of a distant planet, lit to emphasise its atmospheric glow against deep space.",
        ],
    },
    {
        name: "Photographic Collection - Gallery",
        preview: "/media/projects/photographic-collection/teaser.webp",
        slug: "photographic-collection",
        title: "Photographic Collection",
        role: "Photography",
        year: "2025",
        stack: "Lightroom · Photoshop",
        lede: "Eight frames on nature, industry, labour and solitude.",
        body: [
            "Quiet Bloom, Power at Dawn, Submerged Patterns, Through the Green Corridor, Watcher in the Mist, Lines of Labor, Industrial Silence and The Long Walk.",
            "From white water lilies on still water to a lone figure walking into fog, the collection explores calm persistence, scale, rhythm and forward motion, where human systems meet the landscape around them.",
        ],
    },
    {
        name: "Video Showcase - YouTube",
        link: "https://www.youtube.com/watch?v=-7zyak9mfQg",
        preview: "/media/projects/video-showcase/teaser.svg",
        slug: "video-showcase",
        title: "Video Showcase",
        role: "Motion & 3D",
        year: "2025",
        stack: "Blender · After Effects · Premiere Pro",
        lede: "My work in motion: esports edits, 3D animation and motion graphics.",
        body: [
            "An esports frags compilation, a 3D work showcase, a 3D animation showcase and a look at modeling in Blender.",
        ],
    },
    {
        name: "Unimart Kids Carnival Campaign - Client",
        preview: "/media/projects/unimart-kids-carnival/teaser.svg",
        slug: "unimart-kids-carnival",
        title: "Unimart Kids Carnival Campaign",
        role: "Campaign Design",
        year: "2025",
        stack: "Photoshop · Illustrator",
        lede: "Project was about precision and information.",
        body: [
            "Campaign visuals for an international client, where precision and clarity of information led every design decision.",
        ],
    },
    {
        name: "Premia Education Logo Design - Client",
        preview: "/media/projects/premia-education/teaser.svg",
        slug: "premia-education",
        title: "Premia Education Logo Design",
        role: "Brand Identity",
        year: "2025",
        stack: "Illustrator",
        lede: "Creating a memorable brand identity for educational excellence.",
        body: [
            "A logo and identity built to feel trustworthy and memorable for an education brand.",
        ],
    },
] as const;

export const projectsData: readonly (Omit<(typeof projectsList)[number], "link"> & { link?: string; loop?: string })[] = projectsList;

export type CaseStudy = (typeof projectsData)[number];

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
        "I'm a creative designer and visualizer from Dhaka, Bangladesh, specialized in 3D design and visual storytelling. I've built content for 10 Minute School, led design at Ostad, taught graphic design at BRAC, and created more than 55 3D game environments and assets since 2023.",
        "Outside the studio I work across data analytics, research and competitive esports, from quantum error correction experiments and an AI/ML water safety study to leading TEX Esports to a top-6 PMCO finish. I design and code beautifully simple things, and I love what I do.",
    ],
    manifesto: [
        "I design and code beautifully simple things.",
        "3D design and visual storytelling, end to end.",
        "Research, analytics and esports sharpen how I design.",
        "Currently available for freelance and full-time work.",
    ],
    facts: [
        "Based in / Dhaka, Bangladesh",
        "Focus / 3D design, visual design, motion graphics",
        "Toolkit / Blender, Substance Painter, Unreal Engine, Adobe CC",
        "Open to / Freelance and full-time roles",
        "Contact / talhazobayed7@gmail.com",
    ],
} as const;

export const bioImage = {
    src: "/images/talha_bio.jpg",
    alt: "Talha Zobayed Tanim smiling with arms crossed in a striped T-shirt against a blue backdrop",
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
