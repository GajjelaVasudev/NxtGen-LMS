/// <reference types="vite/client" />

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { FormInput } from "@/components/FormInput";
import { SocialLogin } from "@/components/SocialLogin";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

const CAROUSEL_IMAGES = [
    {
        url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=800&fit=crop",
        title: "Welcome to NxtGen LMS",
        description: "Your journey to better learning starts here",
    },
    {
        url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&h=800&fit=crop",
        title: "Learn at Your Own Pace",
        description: "Access courses anytime, anywhere",
    },
    {
        url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&h=800&fit=crop",
        title: "Track Your Progress",
        description: "Monitor your learning journey with detailed analytics",
    },
    {
        url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=800&fit=crop",
        title: "Join Our Community",
        description: "Connect with thousands of learners worldwide",
    },
];

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [hintsOpen, setHintsOpen] = useState(false);

    // carousel state
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Example registered accounts for demo; replace with real data or fetch from API as needed
    const registeredEmails = [
        { email: "admin@gmail.com", role: "admin" },
        { email: "instructor@gmail.com", role: "instructor" },
        { email: "creator@gmail.com", role: "contentCreator" },
        { email: "student@gmail.com", role: "user" },
    ];

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const API = import.meta.env.DEV
                ? "/api"
                : ((import.meta.env.VITE_API_URL as string) || "/api");

            const res = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({ message: res.statusText }));
                throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
            }

            const data = await res.json();
            // If server returned a Supabase session include it when logging in
            // Also pass the plaintext password so AuthContext can fallback to signInWithPassword
            await login({ ...(data.user || {}), email, password } as any, data.session);
            navigate("/app");
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err?.message || "Unable to connect to server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    };

    const prevImage = () => {
        setCurrentImageIndex(
            (prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length
        );
    };

    const goToImage = (index: number) => {
        setCurrentImageIndex(index);
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "admin":
                return "bg-red-100 text-red-700";
            case "instructor":
                return "bg-blue-100 text-blue-700";
            case "contentCreator":
                return "bg-green-100 text-green-700";
            case "user":
                return "bg-purple-100 text-purple-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case "admin":
                return "Administrator";
            case "instructor":
                return "Instructor";
            case "contentCreator":
                return "Content Creator";
            case "user":
                return "Student";
            default:
                return role;
        }
    };

    return (
        <div className="min-h-screen bg-white flex">
            {/* Left Side - Login Form */}
            <div className="w-full lg:w-3/5 px-6 md:px-12 lg:px-16 py-8 flex flex-col relative">
                {/* Back arrow top-left */}
                <div className="absolute top-6 left-6">
                    <Link to="/" aria-label="Back to landing" className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                        <ChevronLeft className="w-5 h-5 text-indigo-600" />
                    </Link>
                </div>

                <div className="mt-6 w-full max-w-[520px] mx-auto">
                    <div className="flex items-start gap-6">
                        <Logo />
                    </div>

                    <div className="mt-6 bg-white rounded-2xl shadow-md p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-black">Welcome back</h1>
                                <p className="text-sm text-gray-600 mt-1">Sign in to continue to NxtGenLMS</p>
                            </div>
                        </div>

                        {/* Collapsible role-specific hints */}
                        <div className="mt-5">
                            <button
                                onClick={() => setHintsOpen((s) => !s)}
                                className="w-full flex items-center justify-between px-4 py-2 rounded-md bg-gray-50 border border-gray-100 hover:bg-gray-100 transition"
                            >
                                <div className="text-sm text-gray-700">Role-specific email hints</div>
                                <div className="text-xs text-gray-500">{hintsOpen ? 'Hide' : 'Show'}</div>
                            </button>

                            {hintsOpen && (
                                <div className="mt-3 p-3 bg-white border border-gray-100 rounded-lg">
                                    <div className="space-y-2">
                                        {registeredEmails.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <div className="text-sm text-gray-700 font-medium">{getRoleLabel(item.role)}</div>
                                                <div className="text-xs text-gray-500 font-mono">{item.email}</div>
                                            </div>
                                        ))}
                                        <div className="text-xs text-gray-500 mt-2">Password hint: use the role name + <code className="bg-gray-100 px-1 rounded">123</code> for demo accounts.</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                            <FormInput
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter registered email"
                                required
                                className="border border-black"
                            />

                            <FormInput
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                className="border border-black"
                            />

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="remember"
                                        checked={rememberMe}
                                        onCheckedChange={(checked) =>
                                            setRememberMe(checked as boolean)
                                        }
                                        className="w-5 h-5 border-[#313131] border"
                                    />
                                    <label
                                        htmlFor="remember"
                                        className="text-sm text-gray-700 font-medium cursor-pointer"
                                    >
                                        Remember me
                                    </label>
                                </div>
                                <Link
                                    to="/forgot-password"
                                    className="text-indigo-600 text-sm font-medium hover:underline hover:text-indigo-700 transition"
                                >
                                    Forgot Password
                                </Link>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 btn-primary rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Logging in..." : "Login"}
                            </button>

                            <div className="mt-2">
                                <SocialLogin />
                            </div>

                            <div className="text-center mt-4">
                                <span className="text-gray-600 text-sm">Don't have an account? </span>
                                <Link to="/signup" className="text-indigo-600 text-sm font-semibold hover:underline hover:text-indigo-700 transition">Sign up</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Right Side - Image Carousel */}
            <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden min-h-screen items-end justify-start">
                <div className="absolute inset-0">
                    <img
                        src={CAROUSEL_IMAGES[currentImageIndex].url}
                        alt={CAROUSEL_IMAGES[currentImageIndex].title}
                        className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                </div>

                <div className="relative z-10 flex flex-col items-start p-8 md:p-12 text-white max-w-[520px] mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-3">
                        {CAROUSEL_IMAGES[currentImageIndex].title}
                    </h2>
                    <p className="text-md md:text-lg mb-6 text-white/90">
                        {CAROUSEL_IMAGES[currentImageIndex].description}
                    </p>

                    <div className="flex items-center gap-3 mt-6">
                        <button
                            onClick={prevImage}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-all"
                            aria-label="Previous image"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="flex gap-2">
                            {CAROUSEL_IMAGES.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => goToImage(index)}
                                    className={`h-2 rounded-full transition-all ${
                                        index === currentImageIndex
                                            ? "w-8 bg-white"
                                            : "w-2 bg-white/50 hover:bg-white/70"
                                    }`}
                                    aria-label={`Go to image ${index + 1}`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={nextImage}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-all"
                            aria-label="Next image"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}