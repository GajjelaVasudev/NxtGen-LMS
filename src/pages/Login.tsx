import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { FormInput } from "@/components/FormInput";
import { SocialLogin } from "@/components/SocialLogin";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
// Mock user data for demonstration purposes
const DEMO_USERS = [
	{ id: "admin1", email: "admin@test.com", role: "admin" as const, name: "Admin User" },
	{ id: "instructor1", email: "instructor@test.com", role: "instructor" as const, name: "Instructor User" },
	{ id: "creator1", email: "creator@test.com", role: "contentCreator" as const, name: "Content Creator" },
	{ id: "student1", email: "student@test.com", role: "user" as const, name: "Student User" },
];

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
	const [currentImageIndex, setCurrentImageIndex] = useState(0);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const demoUser = DEMO_USERS.find((user) => user.email === email);

			if (demoUser) {
				console.log("Logging in user:", demoUser);
				login(demoUser);
				console.log("Navigating to /app");
				navigate("/app");
			} else {
				setError(
					"Please use one of the demo emails: admin@test.com, instructor@test.com, creator@test.com, or student@test.com"
				);
			}
		} catch (err) {
			console.error("Login error:", err);
			setError("Login failed. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const quickLogin = (userType: "admin" | "instructor" | "creator" | "student") => {
		const user = DEMO_USERS.find((u) => u.email.startsWith(userType));
		if (user) {
			console.log("Quick logging in user:", user);
			login(user);
			navigate("/app");
		}
	};

	const nextImage = () => {
		setCurrentImageIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
	};

	const prevImage = () => {
		setCurrentImageIndex((prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length);
	};

	const goToImage = (index: number) => {
		setCurrentImageIndex(index);
	};

	return (
		<div className="min-h-screen bg-white flex">
			<div className="w-full lg:w-1/2 px-6 md:px-16 lg:px-26 py-12 flex flex-col">
				<Logo />

				<div className="flex-1 flex items-center justify-center max-w-[512px] mx-auto w-full">
					<div className="w-full flex flex-col gap-10">
						<div className="flex flex-col gap-4">
							<h1 className="text-[#313131] font-poppins text-[40px] font-bold leading-normal">Login</h1>
							<p className="text-[#313131] font-poppins text-base opacity-75">Login to access your account</p>
						</div>

						{/* Quick Login Section for Testing */}
						<div className="bg-gray-50 p-4 rounded-lg">
							<h3 className="text-sm font-medium text-gray-700 mb-3">Quick Login (Testing):</h3>
							<div className="grid grid-cols-2 gap-2">
								<button
									onClick={() => quickLogin("admin")}
									className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
								>
									Admin
								</button>
								<button
									onClick={() => quickLogin("instructor")}
									className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
								>
									Instructor
								</button>
								<button
									onClick={() => quickLogin("creator")}
									className="px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
								>
									Creator
								</button>
								<button
									onClick={() => quickLogin("student")}
									className="px-3 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 transition-colors"
								>
									Student
								</button>
							</div>
						</div>

						{/* Demo Credentials */}
						<div className="bg-blue-50 p-4 rounded-lg">
							<h3 className="text-sm font-medium text-blue-700 mb-2">Demo Credentials:</h3>
							<div className="text-xs text-blue-600 space-y-1">
								<div>
									<strong>Admin:</strong> admin@test.com
								</div>
								<div>
									<strong>Instructor:</strong> instructor@test.com
								</div>
								<div>
									<strong>Creator:</strong> creator@test.com
								</div>
								<div>
									<strong>Student:</strong> student@test.com
								</div>
								<div className="mt-2 text-blue-500">Password: Any password works for demo</div>
							</div>
						</div>

						<form onSubmit={handleSubmit} className="flex flex-col gap-10">
							<div className="flex flex-col gap-6">
								<FormInput
									label="Email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="Enter demo email (e.g., admin@test.com)"
								/>

								<FormInput
									label="Password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Any password for demo"
								/>

								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Checkbox
											id="remember"
											checked={rememberMe}
											onCheckedChange={(checked) => setRememberMe(checked as boolean)}
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
								<div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
							)}

							<div className="flex flex-col gap-4">
								<button
									type="submit"
									disabled={loading}
									className="w-full h-12 bg-[#515DEF] rounded flex items-center justify-center text-[#F3F3F3] font-poppins text-sm font-bold hover:bg-[#515DEF]/90 transition-colors disabled:opacity-60"
								>
									{loading ? "Logging in..." : "Login"}
								</button>

								<p className="text-center text-sm font-poppins">
									<span className="text-[#313131]">Don't have an account? </span>
									<Link
										to="/signup"
										className="text-[#FF8682] font-bold hover:underline"
									>
										Sign up
									</Link>
								</p>
							</div>

							<SocialLogin />
						</form>
					</div>
				</div>
			</div>

			{/* Image Carousel Section */}
			<div className="hidden lg:flex lg:w-1/2 items-center justify-center p-16 bg-gradient-to-br from-blue-50 to-purple-50">
				<div className="relative w-full max-w-[616px] h-[816px]">
					{/* Main Image */}
					<div className="relative w-full h-full overflow-hidden rounded-[30px] shadow-2xl">
						<img
							src={CAROUSEL_IMAGES[currentImageIndex].url}
							alt={CAROUSEL_IMAGES[currentImageIndex].title}
							className="w-full h-full object-cover transition-opacity duration-500"
						/>

						{/* Overlay Content */}
						<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8 text-white">
							<h3 className="text-2xl font-bold mb-2">
								{CAROUSEL_IMAGES[currentImageIndex].title}
							</h3>
							<p className="text-sm opacity-90">
								{CAROUSEL_IMAGES[currentImageIndex].description}
							</p>
						</div>
					</div>

					{/* Navigation Arrows */}
					<button
						onClick={prevImage}
						className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
						aria-label="Previous image"
					>
						<ChevronLeft className="w-6 h-6 text-gray-800" />
					</button>

					<button
						onClick={nextImage}
						className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
						aria-label="Next image"
					>
						<ChevronRight className="w-6 h-6 text-gray-800" />
					</button>

					{/* Dot Indicators */}
					<div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
						{CAROUSEL_IMAGES.map((_, index) => (
							<button
								key={index}
								onClick={() => goToImage(index)}
								className={`transition-all ${
									index === currentImageIndex
										? "w-8 h-2.5 bg-white rounded-full"
										: "w-2.5 h-2.5 bg-white/50 hover:bg-white/75 rounded-full"
								}`}
								aria-label={`Go to image ${index + 1}`}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}