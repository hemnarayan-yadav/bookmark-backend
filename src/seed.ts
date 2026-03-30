/**
 * Seed script — inserts 3 demo users + 30 real bookmarks into MongoDB.
 * Run: ts-node src/seed.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

// ── Inline schema imports (avoids compiled model conflicts when running directly)
import User from "./models/User";
import Tag from "./models/Tag";
import Bookmark from "./models/Bookmark";

const MONGO_URI = process.env.MONGODB_URI!;

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Clean existing seed data
  await Bookmark.deleteMany({});
  await Tag.deleteMany({});
  await User.deleteMany({});
  console.log("🗑️  Cleared old data");

  // ── Users ──────────────────────────────────────────────────────────────────
  const password_hash = await bcrypt.hash("Password@123", 10);

  const [hem, alice, bob] = await User.insertMany([
    {
      username: "hemnarayan",
      email: "hem@example.com",
      password_hash,
      full_name: "Hem Narayan Yadav",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=hemnarayan",
      is_active: true,
    },
    {
      username: "alice_dev",
      email: "alice@example.com",
      password_hash,
      full_name: "Alice Johnson",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
      is_active: true,
    },
    {
      username: "bob_codes",
      email: "bob@example.com",
      password_hash,
      full_name: "Bob Smith",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
      is_active: true,
    },
  ]);
  console.log("👤 Users created");

  // ── Tags ───────────────────────────────────────────────────────────────────
  const createTags = async (userId: mongoose.Types.ObjectId, names: string[]) => {
    const docs = names.map((name) => ({ user_id: userId, name }));
    return Tag.insertMany(docs);
  };

  const hemTags = await createTags(hem._id, [
    "javascript", "react", "nodejs", "mongodb", "tools", "design", "career",
  ]);
  const aliceTags = await createTags(alice._id, [
    "python", "machine-learning", "open-source", "productivity",
  ]);
  const bobTags = await createTags(bob._id, [
    "devops", "docker", "cloud", "security",
  ]);

  const hemTagMap = Object.fromEntries(hemTags.map((t) => [t.name, t._id]));
  const aliceTagMap = Object.fromEntries(aliceTags.map((t) => [t.name, t._id]));
  const bobTagMap = Object.fromEntries(bobTags.map((t) => [t.name, t._id]));

  // ── Bookmarks ──────────────────────────────────────────────────────────────
  await Bookmark.insertMany([
    // ── Hem (12 bookmarks) ─────────────────────────────────────────────────
    {
      user_id: hem._id,
      title: "MDN Web Docs",
      url: "https://developer.mozilla.org",
      description: "The most comprehensive reference for web developers — HTML, CSS, JS APIs.",
      favicon: "https://developer.mozilla.org/favicon-48x48.png",
      folder: "Web Dev",
      is_public: true,
      tags: [hemTagMap["javascript"]],
    },
    {
      user_id: hem._id,
      title: "React Documentation",
      url: "https://react.dev",
      description: "Official React docs with interactive examples and the new canary features.",
      favicon: "https://react.dev/favicon.ico",
      folder: "Web Dev",
      is_public: true,
      tags: [hemTagMap["javascript"], hemTagMap["react"]],
    },
    {
      user_id: hem._id,
      title: "Node.js Official Docs",
      url: "https://nodejs.org/en/docs",
      description: "API reference for the Node.js runtime — great for backend development.",
      favicon: "https://nodejs.org/static/images/favicons/favicon.png",
      folder: "Backend",
      is_public: true,
      tags: [hemTagMap["nodejs"], hemTagMap["javascript"]],
    },
    {
      user_id: hem._id,
      title: "MongoDB Atlas",
      url: "https://www.mongodb.com/atlas",
      description: "Cloud-hosted MongoDB — spin up a free cluster in seconds.",
      favicon: "https://www.mongodb.com/assets/images/global/favicon.ico",
      folder: "Backend",
      is_public: true,
      tags: [hemTagMap["mongodb"]],
    },
    {
      user_id: hem._id,
      title: "Mongoose ODM Docs",
      url: "https://mongoosejs.com/docs",
      description: "Elegant MongoDB object modeling for Node.js.",
      favicon: "https://mongoosejs.com/docs/images/favicon.png",
      folder: "Backend",
      is_public: false,
      tags: [hemTagMap["mongodb"], hemTagMap["nodejs"]],
    },
    {
      user_id: hem._id,
      title: "Tailwind CSS",
      url: "https://tailwindcss.com",
      description: "Utility-first CSS framework for rapid UI development.",
      favicon: "https://tailwindcss.com/favicons/favicon-32x32.png",
      folder: "Design",
      is_public: true,
      tags: [hemTagMap["design"]],
    },
    {
      user_id: hem._id,
      title: "Figma",
      url: "https://figma.com",
      description: "Collaborative interface design tool used by top product teams.",
      favicon: "https://static.figma.com/app/icon/1/favicon.ico",
      folder: "Design",
      is_public: false,
      tags: [hemTagMap["design"], hemTagMap["tools"]],
    },
    {
      user_id: hem._id,
      title: "Vercel",
      url: "https://vercel.com",
      description: "Deploy frontend apps instantly with zero configuration.",
      favicon: "https://vercel.com/favicon.ico",
      folder: "Tools",
      is_public: true,
      tags: [hemTagMap["tools"]],
    },
    {
      user_id: hem._id,
      title: "GitHub",
      url: "https://github.com",
      description: "The world's leading platform for version control and open-source collaboration.",
      favicon: "https://github.githubassets.com/favicons/favicon.png",
      folder: "Tools",
      is_public: true,
      tags: [hemTagMap["tools"]],
    },
    {
      user_id: hem._id,
      title: "Roadmap.sh",
      url: "https://roadmap.sh",
      description: "Interactive developer roadmaps for learning any tech stack.",
      favicon: "https://roadmap.sh/manifest/apple-touch-icon.png",
      folder: "Career",
      is_public: true,
      tags: [hemTagMap["career"]],
    },
    {
      user_id: hem._id,
      title: "TypeScript Handbook",
      url: "https://www.typescriptlang.org/docs/handbook/intro.html",
      description: "The official TypeScript handbook — from basics to advanced types.",
      favicon: "https://www.typescriptlang.org/favicon-32x32.png",
      folder: "Web Dev",
      is_public: true,
      tags: [hemTagMap["javascript"]],
    },
    {
      user_id: hem._id,
      title: "Express.js Guide",
      url: "https://expressjs.com/en/guide/routing.html",
      description: "Minimalist Node.js web framework — routing, middleware, and more.",
      favicon: "https://expressjs.com/images/favicon.png",
      folder: "Backend",
      is_public: true,
      tags: [hemTagMap["nodejs"]],
    },

    // ── Alice (10 bookmarks) ───────────────────────────────────────────────
    {
      user_id: alice._id,
      title: "Hugging Face",
      url: "https://huggingface.co",
      description: "The AI community building the future — models, datasets, and spaces.",
      favicon: "https://huggingface.co/favicon.ico",
      folder: "AI/ML",
      is_public: true,
      tags: [aliceTagMap["machine-learning"]],
    },
    {
      user_id: alice._id,
      title: "Papers With Code",
      url: "https://paperswithcode.com",
      description: "Machine learning papers with open-source implementations.",
      favicon: "https://paperswithcode.com/static/favicon.ico",
      folder: "AI/ML",
      is_public: true,
      tags: [aliceTagMap["machine-learning"], aliceTagMap["open-source"]],
    },
    {
      user_id: alice._id,
      title: "Python Official Docs",
      url: "https://docs.python.org/3",
      description: "The complete Python 3 language and standard library reference.",
      favicon: "https://docs.python.org/3/_static/py.png",
      folder: "Python",
      is_public: true,
      tags: [aliceTagMap["python"]],
    },
    {
      user_id: alice._id,
      title: "FastAPI",
      url: "https://fastapi.tiangolo.com",
      description: "Modern, fast web framework for building APIs with Python 3.10+.",
      favicon: "https://fastapi.tiangolo.com/img/favicon.png",
      folder: "Python",
      is_public: true,
      tags: [aliceTagMap["python"]],
    },
    {
      user_id: alice._id,
      title: "Notion",
      url: "https://notion.so",
      description: "All-in-one workspace for notes, docs, wikis, and project management.",
      favicon: "https://www.notion.so/images/favicon.ico",
      folder: "Productivity",
      is_public: false,
      tags: [aliceTagMap["productivity"]],
    },
    {
      user_id: alice._id,
      title: "Excalidraw",
      url: "https://excalidraw.com",
      description: "Virtual collaborative whiteboard for sketching diagrams and flows.",
      favicon: "https://excalidraw.com/favicon.ico",
      folder: "Productivity",
      is_public: true,
      tags: [aliceTagMap["productivity"]],
    },
    {
      user_id: alice._id,
      title: "Kaggle",
      url: "https://kaggle.com",
      description: "ML competitions, datasets, and notebooks — great for hands-on practice.",
      favicon: "https://www.kaggle.com/static/images/favicon.ico",
      folder: "AI/ML",
      is_public: true,
      tags: [aliceTagMap["machine-learning"]],
    },
    {
      user_id: alice._id,
      title: "Open Source Guide",
      url: "https://opensource.guide",
      description: "Best practices for contributing to and maintaining open-source projects.",
      favicon: "https://opensource.guide/assets/images/favicon.ico",
      folder: "Open Source",
      is_public: true,
      tags: [aliceTagMap["open-source"]],
    },
    {
      user_id: alice._id,
      title: "Scikit-learn",
      url: "https://scikit-learn.org/stable",
      description: "Simple and efficient tools for predictive data analysis in Python.",
      favicon: "https://scikit-learn.org/stable/_static/favicon.ico",
      folder: "Python",
      is_public: true,
      tags: [aliceTagMap["python"], aliceTagMap["machine-learning"]],
    },
    {
      user_id: alice._id,
      title: "Linear",
      url: "https://linear.app",
      description: "Issue tracking built for modern software development teams.",
      favicon: "https://linear.app/favicon.ico",
      folder: "Productivity",
      is_public: false,
      tags: [aliceTagMap["productivity"]],
    },

    // ── Bob (8 bookmarks) ──────────────────────────────────────────────────
    {
      user_id: bob._id,
      title: "Docker Documentation",
      url: "https://docs.docker.com",
      description: "Official Docker docs for building, shipping, and running containers.",
      favicon: "https://docs.docker.com/favicons/docs@2x.ico",
      folder: "DevOps",
      is_public: true,
      tags: [bobTagMap["docker"], bobTagMap["devops"]],
    },
    {
      user_id: bob._id,
      title: "Kubernetes Documentation",
      url: "https://kubernetes.io/docs/home",
      description: "Production-grade container orchestration at scale.",
      favicon: "https://kubernetes.io/images/favicon.png",
      folder: "DevOps",
      is_public: true,
      tags: [bobTagMap["devops"], bobTagMap["cloud"]],
    },
    {
      user_id: bob._id,
      title: "AWS Documentation",
      url: "https://docs.aws.amazon.com",
      description: "Complete reference for Amazon Web Services cloud products.",
      favicon: "https://a0.awsstatic.com/libra-css/images/site/fav/favicon.ico",
      folder: "Cloud",
      is_public: true,
      tags: [bobTagMap["cloud"]],
    },
    {
      user_id: bob._id,
      title: "Terraform Docs",
      url: "https://developer.hashicorp.com/terraform/docs",
      description: "Infrastructure as code — provision any cloud provider declaratively.",
      favicon: "https://www.datocms-assets.com/2885/1620155117-brandhcterraformverticalcolor.svg",
      folder: "DevOps",
      is_public: true,
      tags: [bobTagMap["devops"], bobTagMap["cloud"]],
    },
    {
      user_id: bob._id,
      title: "OWASP Top 10",
      url: "https://owasp.org/www-project-top-ten",
      description: "The ten most critical web application security risks and how to fix them.",
      favicon: "https://owasp.org/assets/images/logo.png",
      folder: "Security",
      is_public: true,
      tags: [bobTagMap["security"]],
    },
    {
      user_id: bob._id,
      title: "Grafana",
      url: "https://grafana.com",
      description: "Open-source observability platform for metrics, logs, and traces.",
      favicon: "https://grafana.com/static/assets/img/fav32.png",
      folder: "DevOps",
      is_public: true,
      tags: [bobTagMap["devops"]],
    },
    {
      user_id: bob._id,
      title: "Nginx Documentation",
      url: "https://nginx.org/en/docs",
      description: "High-performance web server, reverse proxy, and load balancer.",
      favicon: "https://nginx.org/favicon.ico",
      folder: "DevOps",
      is_public: false,
      tags: [bobTagMap["devops"]],
    },
    {
      user_id: bob._id,
      title: "Cloudflare",
      url: "https://www.cloudflare.com",
      description: "Global network platform for security, performance, and reliability.",
      favicon: "https://www.cloudflare.com/favicon.ico",
      folder: "Cloud",
      is_public: true,
      tags: [bobTagMap["cloud"], bobTagMap["security"]],
    },
  ]);

  console.log("🔖 30 bookmarks seeded successfully");
  console.log("\n📋 Demo Accounts (password: Password@123)");
  console.log("  hem@example.com    — hemnarayan");
  console.log("  alice@example.com  — alice_dev");
  console.log("  bob@example.com    — bob_codes");

  await mongoose.disconnect();
  console.log("\n✅ Seed complete!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
