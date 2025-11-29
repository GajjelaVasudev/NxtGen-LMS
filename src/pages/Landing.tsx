import { useState, useRef } from "react";
import { Instagram, Twitter, Linkedin, BookOpen, Users, Award, Video, FileText, MessageCircle, BarChart3, CheckCircle, Star, ArrowRight, Play, Globe, Clock, Shield } from "lucide-react";
import "../styles/landing.css";
import { useNavigate, Link } from "react-router-dom";



export default function Landing() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  // Logo surprise removed: keep logo static and non-secret

  function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    // navigate to signup and pass the entered email so it can be pre-filled
    navigate("/signup", { state: { email } });
  }

  const features = [
    {
      icon: <BookOpen className="w-12 h-12 text-brand" />,
      title: "Course Management",
      description: "Create, organize, and deliver engaging courses with multimedia content, quizzes, and assignments all in one place.",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&h=300&fit=crop"
    },
    {
      icon: <Users className="w-12 h-12 text-brand" />,
      title: "Student Tracking",
      description: "Monitor student progress, track completion rates, and provide personalized feedback to enhance learning outcomes.",
      image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&h=300&fit=crop"
    },
    {
      icon: <BarChart3 className="w-12 h-12 text-brand" />,
      title: "Analytics & Reports",
      description: "Get detailed insights into student performance, course effectiveness, and platform engagement with comprehensive analytics.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&h=300&fit=crop"
    },
    {
      icon: <MessageCircle className="w-12 h-12 text-brand" />,
      title: "Interactive Learning",
      description: "Foster collaboration with discussion forums, real-time notifications, and integrated communication tools.",
      image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=500&h=300&fit=crop"
    }
  ];

  const benefits = [
    {
      icon: <Video className="w-8 h-8" />,
      title: "Rich Media Support",
      description: "Upload videos, images, PDFs, and interactive content to create engaging learning experiences."
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Assignment Management",
      description: "Create, distribute, and grade assignments efficiently with automated workflows and deadline tracking."
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Progress Tracking",
      description: "Track student progress with detailed analytics, completion rates, and performance metrics."
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Role-Based Access",
      description: "Secure platform with customizable roles for admins, instructors, content creators, and students."
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Flexible Learning",
      description: "Self-paced courses with 24/7 access, allowing students to learn at their own convenience."
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Cloud-Based Platform",
      description: "Access your courses from anywhere, on any device with our responsive cloud-based system."
    }
  ];

  const anonymousAvatar = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const testimonials = [
    {
      name: "Anonymous instructor",
      role: "University Professor",
      image: anonymousAvatar,
      rating: 5,
      text:
        "NxtGen LMS has completely improved the way I deliver my classes. The interface is smooth and the features are powerful.",
    },
    {
      name: "Anonymous Corporate Trainer",
      role: "Corporate Trainer",
      image: anonymousAvatar,
      rating: 5,
      text:
        "The analytics and tracking tools help me monitor employee learning progress in real-time. Very effective platform.",
    },
    {
      name: "Anonymous Course Creator",
      role: "Online Course Creator",
      image: anonymousAvatar,
      rating: 5,
      text:
        "Creating and managing courses became super easy. The platform is fast, reliable, and extremely feature-rich.",
    },
  ];

  const stats = [
    { number: "50K+", label: "Active Students" },
    { number: "1,000+", label: "Courses Created" },
    { number: "500+", label: "Instructors" },
    { number: "98%", label: "Satisfaction Rate" }
  ];

  const pricingPlans = [
    {
      name: "Student",
      price: "Free",
      description: "Perfect for learners getting started",
      features: [
        "Access to free courses",
        "Basic progress tracking",
        "Community forums",
        "Mobile app access",
        "Email support"
      ],
      highlighted: false
    },
    {
      name: "Instructor",
      price: "₹999",
      period: "/month",
      description: "Ideal for individual educators",
      features: [
        "Create unlimited courses",
        "Student analytics",
        "Assignment grading tools",
        "Video hosting",
        "Priority support",
        "Custom branding"
      ],
      highlighted: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For schools and organizations",
      features: [
        "Everything in Instructor",
        "Advanced analytics",
        "Multiple instructors",
        "API access",
        "Dedicated support",
        "Custom integrations"
      ],
      highlighted: false
    }
  ];

  return (
    <div className="landing-root relative min-h-screen bg-white overflow-hidden">

      {/* Header */}
      <header className="px-4 md:px-16 lg:px-20 py-6 sticky top-0 bg-white/95 backdrop-blur-sm z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-4xl md:text-5xl font-bold">
            <span className="text-brand-blue text-nxtgen-blue">Nxt</span>
            <span className="text-brand-yellow text-nxtgen-yellow text-[#FFCC00]">Gen</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-700 hover:text-brand transition-colors">Features</a>
            <a href="#benefits" className="text-gray-700 hover:text-brand transition-colors">Benefits</a>
            <a href="#testimonials" className="text-gray-700 hover:text-brand transition-colors">Testimonials</a>
            <a href="#how-it-works" className="text-gray-700 hover:text-brand transition-colors">Working</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="px-4 md:px-6 py-2 md:py-3 text-base md:text-lg border border-black rounded-2xl hover:bg-gray-50 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-4 md:px-6 py-2 md:py-3 text-base md:text-lg bg-brand-cyan text-white rounded-2xl hover:bg-brand-cyan/90 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>


      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 mt-20 md:mt-32 overflow-hidden">

       {/* Animated Background Blobs */}
  <div className="blob w-96 h-96 bg-brand top-10 -left-20"></div>
  <div className="blob w-96 h-96 bg-brand-yellow bottom-10 -right-20"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-block px-4 py-2 bg-blue-50 rounded-full">
              <span className="text-brand font-semibold">🎓 #1 Learning Management System</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Transform Your Teaching & Learning Experience
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed">
              A comprehensive platform where educators create engaging courses, students learn at their own pace, and administrators manage everything seamlessly.
            </p>

            <form onSubmit={handleCreateAccount} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                  className="flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-brand focus:outline-none"
                required
              />
              <button 
                type="submit" 
                  className="px-8 py-4 bg-brand text-white rounded-2xl hover:opacity-95 transition-colors font-semibold text-lg flex items-center justify-center gap-2"
              >
                Browse Courses - Lowest Prices
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
            <p className="text-gray-500">
              Courses available at the lowest prices compared to other LMS platforms.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 pt-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-brand">{stat.number}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div className="absolute -left-10 -top-10 w-72 h-72 bg-brand rounded-full opacity-10 blur-3xl"></div>
            <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-brand-yellow rounded-full opacity-10 blur-3xl"></div>
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=600&fit=crop"
              alt="Students learning"
              className="relative rounded-3xl shadow-2xl w-full"
            />
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-bold">5,000+ Courses</div>
                  <div className="text-sm text-gray-500">Available Now</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 mt-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful features designed to make teaching, learning, and managing courses effortless
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-brand hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
              <div className="mb-6 transform group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="bg-gray-50 py-20 mt-32">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Why Choose NxtGen LMS?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built for educators, designed for learners, trusted by institutions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-brand mb-4">
                    {benefit.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 mt-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600">Get started in three simple steps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            {
              step: "01",
              title: "Create Your Account",
              description: "Sign up to get started. Roles are assigned by administrators — request an instructor role if you wish to teach.",
              icon: <Users className="w-12 h-12" />
            },
            {
              step: "02",
              title: "Build Your Course",
              description: "Upload videos, create quizzes, add assignments, and structure your content.",
              icon: <BookOpen className="w-12 h-12" />
            },
            {
              step: "03",
              title: "Start Learning/Teaching",
              description: "Share your courses, enroll students, track progress, and achieve your goals.",
              icon: <Award className="w-12 h-12" />
            }
          ].map((item, index) => (
            <div key={index} className="text-center">
              <div className="inline-block p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl mb-6">
                  <div className="text-brand">{item.icon}</div>
              </div>
              <div className="text-4xl font-bold text-gray-200 mb-4">{item.step}</div>
              <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="bg-gradient-to-br from-blue-50 to-purple-50 py-20 mt-32">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Loved by Educators & Students
            </h2>
            <p className="text-xl text-gray-600">See what our community has to say</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-3xl p-8 shadow-lg">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">"{testimonial.text}"</p>
                <div className="flex items-center gap-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-bold">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 mt-32 mb-20">
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-12 md:p-20 text-center text-white">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Learning Experience?
          </h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Join thousands of educators and students already using NxtGen LMS to achieve their goals
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/signup"
              className="px-8 py-4 bg-white text-brand rounded-2xl hover:bg-gray-100 transition-colors font-semibold text-lg inline-flex items-center justify-center gap-2"
            >
              Browse Courses
            </Link>
            </div>
          </div>
        </section>

       {/* Footer */}
<footer className="bg-gray-900 text-white py-16">
  <div className="max-w-7xl mx-auto px-4">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

      {/* Brand */}
      <div className="space-y-4">
        <div className="text-4xl font-bold">
          <span className="text-brand-blue text-nxtgen-blue">Nxt</span>
          <span className="text-brand-yellow text-nxtgen-yellow text-[#FFCC00]">Gen</span>
        </div>
        <p className="text-gray-400">
          Empowering education through innovative technology and seamless learning experiences.
        </p>

        <div className="flex gap-4">
          <a 
            href="https://www.instagram.com/vasudev_gajjela_31/?utm_source=ig_web_button_share_sheet"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-brand transition-colors"
          >
            <Instagram size={20} />
          </a>

          <a 
            href="https://x.com/Rameshkumar1013"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-brand transition-colors"
          >
            <span className="text-xl font-bold">X</span>
          </a>

          <a 
            href="https://www.linkedin.com/in/hemanth-gvs-500006348/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-brand transition-colors"
          >
            <Linkedin size={20} />
          </a>
        </div>
      </div>

      {/* Product */}
      <div>
        <h3 className="text-lg font-bold mb-4">Product</h3>
        <ul className="space-y-3 text-gray-400">
          <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
          <li><a href="#how-it-works" className="hover:text-white transition-colors">Working</a></li>
          <li><a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a></li>
          <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
        </ul>
      </div>

      {/* Company */}
      <div>
        <h3 className="text-lg font-bold mb-4">Company</h3>
        <ul className="space-y-3 text-gray-400">
          <li><Link to="/about-us" className="hover:text-white transition-colors">About Us</Link></li>
          <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
          <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
          <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
        </ul>
      </div>

      {/* Support */}
      <div>
        <h3 className="text-lg font-bold mb-4">Support</h3>
        <ul className="space-y-3 text-gray-400">
          <li><Link to="/help-center" className="hover:text-white transition-colors">Help Center</Link></li>
          <li><Link to="/documentation" className="hover:text-white transition-colors">Documentation</Link></li>
          <li><Link to="/api-reference" className="hover:text-white transition-colors">API Reference</Link></li>
          <li><Link to="/status" className="hover:text-white transition-colors">Status</Link></li>
        </ul>
      </div>

    </div>

    {/* Bottom Bar */}
    <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
      <p className="text-gray-400 text-sm">© 2025 NxtGen LMS. All rights reserved.</p>

      <div className="flex gap-6 text-sm text-gray-400">
        <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
        <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
        <Link to="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link>
      </div>
    </div>

  </div>
</footer>


    </div>
  );
}