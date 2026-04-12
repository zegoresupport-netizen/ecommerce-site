// ─── Site ────────────────────────────────────────────────────────────────────

export interface SiteConfig {
  title: string;
  description: string;
  language: string;
}

export const siteConfig: SiteConfig = {
  title: "PureFlow Filters - Premium Water Filtration Solutions",
  description: "Transform your water quality with our premium shower filters, tap filters, water softeners, and replacement cartridges. Experience clean, pure water for your home and family.",
  language: "en",
};

// ─── Navigation ──────────────────────────────────────────────────────────────

export interface MenuLink {
  label: string;
  href: string;
}

export interface SocialLink {
  icon: string;
  label: string;
  href: string;
}

export interface NavigationConfig {
  brandName: string;
  menuLinks: MenuLink[];
  socialLinks: SocialLink[];
  searchPlaceholder: string;
  cartEmptyText: string;
  cartCheckoutText: string;
  continueShoppingText: string;
  menuBackgroundImage: string;
}

export const navigationConfig: NavigationConfig = {
  brandName: "PureFlow",
  menuLinks: [
    { label: "Home", href: "#" },
    { label: "Products", href: "#products" },
    { label: "About Us", href: "#about" },
    { label: "Blog", href: "#blog" },
    { label: "FAQ", href: "#faq" },
    { label: "Contact", href: "#contact" },
  ],
  socialLinks: [
    { icon: "Instagram", label: "Instagram", href: "https://instagram.com" },
    { icon: "Facebook", label: "Facebook", href: "https://facebook.com" },
    { icon: "Twitter", label: "Twitter", href: "https://twitter.com" },
  ],
  searchPlaceholder: "Search products...",
  cartEmptyText: "Your cart is empty",
  cartCheckoutText: "Proceed to Checkout",
  continueShoppingText: "Continue Shopping",
  menuBackgroundImage: "images/menu_bg.jpg",
};

// ─── Hero ────────────────────────────────────────────────────────────────────

export interface HeroConfig {
  tagline: string;
  title: string;
  ctaPrimaryText: string;
  ctaPrimaryTarget: string;
  ctaSecondaryText: string;
  ctaSecondaryTarget: string;
  backgroundImage: string;
}

export const heroConfig: HeroConfig = {
  tagline: "PURE WATER · PURE LIFE",
  title: "Transform Your\nWater Experience",
  ctaPrimaryText: "Shop Now",
  ctaPrimaryTarget: "#products",
  ctaSecondaryText: "Learn More",
  ctaSecondaryTarget: "#about",
  backgroundImage: "images/hero_bg.jpg",
};

// ─── SubHero ─────────────────────────────────────────────────────────────────

export interface Stat {
  value: number;
  suffix: string;
  label: string;
}

export interface SubHeroConfig {
  tag: string;
  heading: string;
  bodyParagraphs: string[];
  linkText: string;
  linkTarget: string;
  image1: string;
  image2: string;
  stats: Stat[];
}

export const subHeroConfig: SubHeroConfig = {
  tag: "OUR MISSION",
  heading: "Clean Water for Every Home",
  bodyParagraphs: [
    "At PureFlow, we believe everyone deserves access to clean, pure water. Our advanced filtration technology removes harmful contaminants while retaining essential minerals, giving you water that's not just safe, but truly nourishing.",
    "From shower filters that protect your skin and hair to whole-house softeners that extend appliance life, we provide comprehensive solutions for every water need.",
  ],
  linkText: "Discover Our Story",
  linkTarget: "#about",
  image1: "images/subhero_1.jpg",
  image2: "images/subhero_2.jpg",
  stats: [
    { value: 500000, suffix: "+", label: "Happy Customers" },
    { value: 50, suffix: "+", label: "Products" },
    { value: 99, suffix: "%", label: "Satisfaction Rate" },
    { value: 5, suffix: "yr", label: "Warranty" },
  ],
};

// ─── Video Section ───────────────────────────────────────────────────────────

export interface VideoSectionConfig {
  tag: string;
  heading: string;
  bodyParagraphs: string[];
  ctaText: string;
  ctaTarget: string;
  backgroundImage: string;
}

export const videoSectionConfig: VideoSectionConfig = {
  tag: "TECHNOLOGY",
  heading: "Advanced Filtration\nYou Can Trust",
  bodyParagraphs: [
    "Our multi-stage filtration process removes chlorine, heavy metals, sediment, and other impurities while preserving beneficial minerals. Each product undergoes rigorous testing to ensure optimal performance.",
    "With easy installation and low maintenance, PureFlow filters integrate seamlessly into your daily routine, providing consistent water quality without hassle.",
  ],
  ctaText: "Explore Technology",
  ctaTarget: "#products",
  backgroundImage: "images/about_lab.jpg",
};

// ─── Products ────────────────────────────────────────────────────────────────

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
}

export interface ProductsConfig {
  tag: string;
  heading: string;
  description: string;
  viewAllText: string;
  addToCartText: string;
  addedToCartText: string;
  categories: string[];
  products: Product[];
}

export const productsConfig: ProductsConfig = {
  tag: "OUR COLLECTION",
  heading: "Premium Water Solutions",
  description: "Discover our range of water filtration products designed to deliver pure, clean water for every need in your home.",
  viewAllText: "View All Products",
  addToCartText: "Add to Cart",
  addedToCartText: "Added!",
  categories: ["All"],
  products: [],
};

// ─── Features ────────────────────────────────────────────────────────────────

export interface Feature {
  icon: "Truck" | "ShieldCheck" | "Leaf" | "Heart";
  title: string;
  description: string;
}

export interface FeaturesConfig {
  features: Feature[];
}

export const featuresConfig: FeaturesConfig = {
  features: [
    {
      icon: "Truck",
      title: "Free Shipping",
      description: "Free delivery on all orders above ₹500. Fast and reliable shipping across India.",
    },
    {
      icon: "ShieldCheck",
      title: "5-Year Warranty",
      description: "All our products come with a comprehensive 5-year warranty for peace of mind.",
    },
    {
      icon: "Leaf",
      title: "Eco-Friendly",
      description: "Sustainable filtration solutions that reduce plastic waste and environmental impact.",
    },
    {
      icon: "Heart",
      title: "60-Day Returns",
      description: "Not satisfied? Return within 60 days for a full refund, no questions asked.",
    },
  ],
};

// ─── Blog ────────────────────────────────────────────────────────────────────

export interface BlogPost {
  id: number;
  title: string;
  date: string;
  image: string;
  excerpt: string;
}

export interface BlogConfig {
  tag: string;
  heading: string;
  viewAllText: string;
  readMoreText: string;
  posts: BlogPost[];
}

export const blogConfig: BlogConfig = {
  tag: "JOURNAL",
  heading: "Water Wellness Tips",
  viewAllText: "View All Articles",
  readMoreText: "Read More",
  posts: [
    {
      id: 1,
      title: "Why Your Hair Needs a Shower Filter",
      date: "March 15, 2026",
      image: "images/blog_hair.jpg",
      excerpt: "Discover how hard water affects your hair and why a shower filter is the secret to healthier, shinier locks.",
    },
    {
      id: 2,
      title: "The Complete Guide to Hard Water Solutions",
      date: "March 10, 2026",
      image: "images/blog_shower.jpg",
      excerpt: "Everything you need to know about identifying, treating, and preventing hard water problems in your home.",
    },
    {
      id: 3,
      title: "Clean Water for a Healthier Kitchen",
      date: "March 5, 2026",
      image: "images/blog_kitchen.jpg",
      excerpt: "Learn how filtered water improves cooking, cleaning, and overall kitchen hygiene for your family.",
    },
  ],
};

// ─── FAQ ─────────────────────────────────────────────────────────────────────

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

export interface FaqConfig {
  tag: string;
  heading: string;
  ctaText: string;
  ctaTarget: string;
  faqs: FaqItem[];
}

export const faqConfig: FaqConfig = {
  tag: "SUPPORT",
  heading: "Frequently Asked Questions",
  ctaText: "Still have questions? Contact us",
  ctaTarget: "#contact",
  faqs: [
    {
      id: 1,
      question: "How often should I replace my filter cartridge?",
      answer: "For optimal performance, we recommend replacing your filter cartridge every 6-12 months, depending on water quality and usage. Our shower filters typically last 8-10 months for a family of four.",
    },
    {
      id: 2,
      question: "Are your filters easy to install?",
      answer: "Yes! All PureFlow products come with detailed installation instructions and require no special tools. Most customers can install our shower and tap filters in under 10 minutes. We also provide installation videos and customer support.",
    },
    {
      id: 3,
      question: "Do your filters work with all water types?",
      answer: "Our filters are designed to work with municipal, borewell, and tanker water. We offer different cartridge options optimized for specific water conditions. Contact our support team for personalized recommendations.",
    },
    {
      id: 4,
      question: "What contaminants do your filters remove?",
      answer: "Our multi-stage filtration removes chlorine, heavy metals (lead, mercury), sediment, rust, and other impurities while retaining essential minerals. Independent lab tests confirm 99% removal of common contaminants.",
    },
    {
      id: 5,
      question: "Do you offer Cash on Delivery?",
      answer: "Yes, we offer COD for orders up to ₹10,000. For larger orders, we recommend online payment for faster processing and additional discounts.",
    },
  ],
};

// ─── About ───────────────────────────────────────────────────────────────────

export interface AboutSection {
  tag: string;
  heading: string;
  paragraphs: string[];
  quote: string;
  attribution: string;
  image: string;
  backgroundColor: string;
  textColor: string;
}

export interface AboutConfig {
  sections: AboutSection[];
}

export const aboutConfig: AboutConfig = {
  sections: [
    {
      tag: "OUR STORY",
      heading: "A Decade of Pure Water Excellence",
      paragraphs: [
        "Founded in 2015, PureFlow began with a simple mission: to make clean, pure water accessible to every Indian household. What started as a small workshop has grown into a trusted brand serving over 500,000 customers.",
        "Our team of engineers and water quality experts continuously innovate to bring you the most effective and affordable filtration solutions on the market.",
      ],
      quote: "",
      attribution: "",
      image: "images/about_factory.jpg",
      backgroundColor: "#f7f7f7",
      textColor: "#333333",
    },
    {
      tag: "OUR PROMISE",
      heading: "Quality You Can Trust",
      paragraphs: [],
      quote: "Every product that leaves our facility carries our promise of purity, performance, and peace of mind.",
      attribution: "-- Rajesh Kumar, Founder & CEO",
      image: "images/about_lab.jpg",
      backgroundColor: "#2c5282",
      textColor: "#ffffff",
    },
  ],
};

// ─── Contact ─────────────────────────────────────────────────────────────────

export interface FormFields {
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
}

export interface ContactConfig {
  heading: string;
  description: string;
  locationLabel: string;
  location: string;
  emailLabel: string;
  email: string;
  phoneLabel: string;
  phone: string;
  formFields: FormFields;
  submitText: string;
  submittingText: string;
  submittedText: string;
  successMessage: string;
  backgroundImage: string;
}

export const contactConfig: ContactConfig = {
  heading: "Get in Touch",
  description: "Have questions about our products or need help choosing the right filter? Our team is here to help you find the perfect water solution for your home.",
  locationLabel: "Visit Us",
  location: "PureFlow Headquarters\n123 Innovation Park\nBangalore, Karnataka 560048",
  emailLabel: "Email Us",
  email: "care@pureflow.in",
  phoneLabel: "Call Us",
  phone: "1800-123-4567",
  formFields: {
    nameLabel: "Your Name",
    namePlaceholder: "Enter your name",
    emailLabel: "Email Address",
    emailPlaceholder: "Enter your email",
    messageLabel: "Message",
    messagePlaceholder: "How can we help you?",
  },
  submitText: "Send Message",
  submittingText: "Sending...",
  submittedText: "Sent!",
  successMessage: "Thank you for reaching out! We'll get back to you within 24 hours.",
  backgroundImage: "images/contact_bg.jpg",
};

// ─── Footer ──────────────────────────────────────────────────────────────────

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterLinkGroup {
  title: string;
  links: FooterLink[];
}

export interface FooterSocialLink {
  icon: string;
  label: string;
  href: string;
}

export interface FooterConfig {
  brandName: string;
  brandDescription: string;
  newsletterHeading: string;
  newsletterDescription: string;
  newsletterPlaceholder: string;
  newsletterButtonText: string;
  newsletterSuccessText: string;
  linkGroups: FooterLinkGroup[];
  legalLinks: FooterLink[];
  copyrightText: string;
  socialLinks: FooterSocialLink[];
}

export const footerConfig: FooterConfig = {
  brandName: "PureFlow",
  brandDescription: "Premium water filtration solutions for a healthier home. Experience the difference of pure, clean water every day.",
  newsletterHeading: "Join Our Community",
  newsletterDescription: "Subscribe for exclusive offers, water tips, and new product announcements.",
  newsletterPlaceholder: "Enter your email",
  newsletterButtonText: "Subscribe",
  newsletterSuccessText: "Welcome to PureFlow! Check your inbox for a special offer.",
  linkGroups: [
    {
      title: "Products",
      links: [
        { label: "Shower Filters", href: "#products" },
        { label: "Tap Filters", href: "#products" },
        { label: "Water Softeners", href: "#products" },
        { label: "Replacement Cartridges", href: "#products" },
        { label: "Accessories", href: "#products" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Installation Guides", href: "#" },
        { label: "Warranty Registration", href: "#" },
        { label: "Track Order", href: "#" },
        { label: "Contact Us", href: "#contact" },
        { label: "FAQs", href: "#faq" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "#about" },
        { label: "Careers", href: "#" },
        { label: "Press", href: "#" },
        { label: "Blog", href: "#blog" },
        { label: "Partner With Us", href: "#" },
      ],
    },
  ],
  legalLinks: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Shipping Policy", href: "#" },
    { label: "Refund Policy", href: "#" },
  ],
  copyrightText: "© 2026 PureFlow. All rights reserved.",
  socialLinks: [
    { icon: "Instagram", label: "Instagram", href: "https://instagram.com" },
    { icon: "Facebook", label: "Facebook", href: "https://facebook.com" },
    { icon: "Twitter", label: "Twitter", href: "https://twitter.com" },
  ],
};
