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
            await login(data.user);
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
            <div className="w-full lg:w-1/2 px-6 md:px-16 lg:px-26 py-12 flex flex-col">
                <Logo />

                <div className="flex-1 flex items-center justify-center max-w-[512px] mx-auto w-full">
                    <div className="w-full flex flex-col gap-10">
                        <div className="flex flex-col gap-4">
                            <h1 className="text-[#313131] font-poppins text-[40px] font-bold leading-normal">
                                Login
                            </h1>
                            <p className="text-[#313131] font-poppins text-base opacity-75">
                                Login to access your account
                            </p>
                        </div>

                        {/* Registered Users Information */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-2 mb-3">
                                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-semibold text-blue-900 mb-1">
                                        Registered Users Only
                                    </h3>
                                    <p className="text-xs text-blue-700">
                                        Only pre-registered email addresses can login to this system.
                                    </p>
                                </div>
                            </div>

                            {registeredEmails.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    <p className="text-xs font-medium text-blue-900">
                                        Available Accounts:
                                    </p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {registeredEmails.map((item, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between bg-white rounded px-3 py-2 border border-blue-100"
                                            >
                                                <span className="text-xs text-gray-700 font-mono">
                                                    {item.email}
                                                </span>
                                                <span
                                                    className={`text-[10px] px-2 py-1 rounded-full font-medium ${getRoleBadgeColor(
                                                        item.role
                                                    )}`}
                                                >
                                                    {getRoleLabel(item.role)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-blue-600 mt-2">
                                        💡 Hint: Password format is [role]123 (e.g.,
                                        admin123, student123)
                                    </p>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-10">
                            <div className="flex flex-col gap-6">
                                <FormInput
                                    label="Email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter registered email"
                                    required
                                />

                                <FormInput
                                    label="Password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                />

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="remember"
                                            checked={rememberMe}
                                            onCheckedChange={(checked) =>
                                                setRememberMe(checked as boolean)
                                            }
                                            className="w-6 h-6 border-[#313131] border-2"
                                        />
                                        <label
                                            htmlFor="remember"
                                            className="text-[#313131] font-poppins text-sm font-medium cursor-pointer"
                                        >
                                            Remember me
                                        </label>
                                    </div>
                                    <Link
                                        to="/forgot-password"
                                        className="text-[#FF8682] text-sm font-medium font-poppins hover:underline"
                                    >
                                        Forgot Password
                                    </Link>
                                </div>
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
                                className="w-full py-4 bg-gradient-to-r from-[#515DEF] to-[#7B68EE] text-white rounded-lg font-poppins text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Logging in..." : "Login"}
                            </button>
                        </form>

                        <SocialLogin />

                        <div className="text-center">
                            <span className="text-[#313131] text-sm">
                                Don't have an account?{" "}
                            </span>
                            <Link
                                to="/signup"
                                className="text-[#FF8682] text-sm font-semibold hover:underline"
                            >
                                Contact Administrator
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Image Carousel */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src={CAROUSEL_IMAGES[currentImageIndex].url}
                        alt={CAROUSEL_IMAGES[currentImageIndex].title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                </div>

                <div className="relative z-10 flex flex-col justify-end p-12 text-white">
                    <h2 className="text-4xl font-bold mb-4">
                        {CAROUSEL_IMAGES[currentImageIndex].title}
                    </h2>
                    <p className="text-xl mb-8 text-white/90">
                        {CAROUSEL_IMAGES[currentImageIndex].description}
                    </p>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={prevImage}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-all"
                            aria-label="Previous image"
                        >
                            <ChevronLeft className="w-6 h-6" />
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
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}