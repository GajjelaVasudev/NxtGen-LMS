import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { FormInput } from "@/components/FormInput";
import { SocialLogin } from "@/components/SocialLogin";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CAROUSEL_IMAGES = [
	{
		url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=800&fit=crop",
		title: "Start Your Learning Journey",
		description: "Join thousands of students and educators worldwide",
	},
	{
		url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=800&fit=crop",
		title: "Create Engaging Courses",
		description: "Build and share your knowledge with interactive content",
	},
	{
		url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=800&fit=crop",
		title: "Track Your Success",
		description: "Monitor progress with comprehensive analytics and reports",
	},
	{
		url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&h=800&fit=crop",
		title: "Collaborate & Grow",
		description: "Connect with a vibrant community of learners",
	},
];

export default function Signup() {
	const navigate = useNavigate();
	const { login } = useAuth();

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [agreeToTerms, setAgreeToTerms] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	// role selection removed; manual signups are students by default
	const [currentImageIndex, setCurrentImageIndex] = useState(0);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		if (!firstName || !lastName || !email || !password || !confirmPassword) {
			setError("Please fill all required fields.");
			return;
		}
		if (password !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}
		if (!agreeToTerms) {
			setError("You must agree to the Terms and Privacy Policies.");
			return;
		}

		setLoading(true);
		try {
			const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
			const res = await fetch(`${API}/auth/register`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password, firstName, lastName }),
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
			}
						const data = await res.json();
						// If the server indicates a verification email was sent, show instructions and do not log in yet
						if (data?.verificationSent) {
							navigate('/verify-email-sent');
							return;
						}
						// If server returned a created canonical user (unlikely in manual flow), auto-login
						try { if (data?.created) localStorage.setItem('nxtgen_justSignedUp', '1'); } catch {}
						await login(data.user || data);
						navigate('/app');
		} catch (err: any) {
			console.error(err);
			setError(err?.message || "Failed to create account. Try again.");
		} finally {
			setLoading(false);
		}
	}

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
			{/* Image Carousel Section */}
			<div className="hidden lg:flex lg:w-[35%] items-center justify-center p-12 bg-gradient-to-br from-purple-50 to-blue-50">
				<div className="relative w-full max-w-[486px] h-[816px]">
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

			{/* Form Section */}
			<div className="w-full lg:w-[65%] px-6 md:px-16 lg:px-20 py-12 flex flex-col">
				<div className="lg:hidden mb-8">
					<Logo />
				</div>
				<div className="hidden lg:block absolute top-12 right-16">
					<Logo />
				</div>

				<div className="flex-1 flex items-center justify-center max-w-[640px] mx-auto w-full">
					<form onSubmit={handleSubmit} className="space-y-4 w-full">
						<div className="flex flex-col gap-4">
							<h1 className="text-[#313131] font-poppins text-[40px] font-bold leading-normal">
								Signup
							</h1>
							<p className="text-[#313131] font-poppins text-base opacity-75">
								Let's get you all set up so you can access your personal
								account.
							</p>
						</div>

						<div className="flex flex-col gap-10">
							<div className="flex flex-col gap-6">
								<div className="flex gap-6 flex-col sm:flex-row">
									<FormInput
										label="First Name"
										type="text"
										value={firstName}
										onChange={(e) => setFirstName(e.target.value)}
										className="flex-1"
									/>
									<FormInput
										label="Last Name"
										type="text"
										value={lastName}
										onChange={(e) => setLastName(e.target.value)}
										className="flex-1"
									/>
								</div>

								<div className="flex gap-6 flex-col sm:flex-row">
									<FormInput
										label="Email"
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										className="flex-1"
									/>
									<FormInput
										label="Phone Number"
										type="tel"
										value={phoneNumber}
										onChange={(e) => setPhoneNumber(e.target.value)}
										className="flex-1"
									/>
								</div>

								<FormInput
									label="Password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>

								<FormInput
									label="Confirm Password"
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
								/>

																{/* Role selection removed — new signups are students by default */}

								<div className="flex items-center gap-2">
									<Checkbox
										id="terms"
										checked={agreeToTerms}
										onCheckedChange={(checked) =>
											setAgreeToTerms(checked as boolean)
										}
										className="w-6 h-6 border-[#313131] border-2"
									/>
									<label
										htmlFor="terms"
										className="text-sm font-poppins cursor-pointer"
									>
										<span className="text-[#313131]">I agree to all the </span>
										<span className="text-[#FF8682] font-bold">
											Terms
										</span>
										<span className="text-[#313131]"> and </span>
										<span className="text-[#FF8682] font-bold">
											Privacy Policies
										</span>
									</label>
								</div>
							</div>

							{error && (
								<div className="text-sm text-red-600 bg-red-50 p-3 rounded">
									{error}
								</div>
							)}

							<div className="flex flex-col gap-4">
								<button
									type="submit"
									disabled={loading}
									className="w-full h-12 bg-[#515DEF] rounded flex items-center justify-center text-[#F3F3F3] font-poppins text-sm font-bold hover:bg-[#515DEF]/90 transition-colors disabled:opacity-60"
								>
									{loading ? "Creating..." : "Create account"}
								</button>

								<p className="text-center text-sm font-poppins">
									<span className="text-[#313131]">Already have an account? </span>
									<Link
										to="/login"
										className="text-[#FF8682] font-bold hover:underline"
									>
										Login
									</Link>
								</p>
							</div>

							<SocialLogin text="Or Sign up with" />
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}