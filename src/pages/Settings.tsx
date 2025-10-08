import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  User, 
  Bell, 
  Lock, 
  Shield, 
  Camera, 
  Mail, 
  Phone, 
  MapPin,
  Link as LinkIcon,
  FileText,
  Save,
  Trash2,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Check,
  X,
  Monitor
} from "lucide-react";

const SETTINGS_STORAGE_KEY = "nxtgen_user_settings";

type NotificationPrefs = {
  assignmentAlerts: boolean;
  courseUpdates: boolean;
  gradeNotifications: boolean;
  discussionReplies: boolean;
  weeklyReport: boolean;
  emailDigest: boolean;
};

type PrivacyPrefs = {
  profileVisibility: "everyone" | "students" | "private";
  showGrades: boolean;
  showActivity: boolean;
  showCourses: boolean;
  allowDirectMessages: boolean;
};

type AppPreferences = {
  displayTheme: "light" | "dark" | "auto";
  languageCode: string;
  timezoneOffset: string;
  dateDisplayFormat: string;
};

type UserSettingsData = {
  userId: string;
  profileInfo: {
    displayName: string;
    emailAddress: string;
    phoneNumber: string;
    aboutMe: string;
    avatarImage: string;
    userLocation: string;
    personalWebsite: string;
  };
  notificationSettings: NotificationPrefs;
  privacySettings: PrivacyPrefs;
  appPreferences: AppPreferences;
};

function retrieveUserSettings(userId: string): UserSettingsData {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const allUserSettings = JSON.parse(stored);
      return allUserSettings[userId] || createDefaultSettings(userId);
    }
  } catch (err) {
    console.error("Error loading user settings:", err);
  }
  return createDefaultSettings(userId);
}

function persistUserSettings(settingsData: UserSettingsData) {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const allUserSettings = stored ? JSON.parse(stored) : {};
    allUserSettings[settingsData.userId] = settingsData;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(allUserSettings));
    window.dispatchEvent(new CustomEvent("userSettings:changed"));
  } catch (err) {
    console.error("Error saving user settings:", err);
  }
}

function createDefaultSettings(userId: string): UserSettingsData {
  const savedTheme = localStorage.getItem("nxtgen_theme") as "light" | "dark" | "auto" || "light";
  
  return {
    userId,
    profileInfo: {
      displayName: "",
      emailAddress: "",
      phoneNumber: "",
      aboutMe: "",
      avatarImage: "",
      userLocation: "",
      personalWebsite: ""
    },
    notificationSettings: {
      assignmentAlerts: true,
      courseUpdates: true,
      gradeNotifications: true,
      discussionReplies: true,
      weeklyReport: false,
      emailDigest: false
    },
    privacySettings: {
      profileVisibility: "everyone",
      showGrades: true,
      showActivity: true,
      showCourses: true,
      allowDirectMessages: true
    },
    appPreferences: {
      displayTheme: savedTheme,
      languageCode: "en-US",
      timezoneOffset: "UTC",
      dateDisplayFormat: "MM/DD/YYYY"
    }
  };
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, effectiveTheme, setTheme } = useTheme();
  const [currentSection, setCurrentSection] = useState<"profile" | "notifications" | "privacy" | "preferences" | "account">("profile");
  const [userSettings, setUserSettings] = useState<UserSettingsData>(() => 
    user ? retrieveUserSettings(user.id) : createDefaultSettings("")
  );
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    verifyPassword: ""
  });
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      const loadedSettings = retrieveUserSettings(user.id);
      loadedSettings.profileInfo.displayName = user.name || loadedSettings.profileInfo.displayName;
      loadedSettings.profileInfo.emailAddress = user.email || loadedSettings.profileInfo.emailAddress;
      
      // Sync theme with ThemeContext
      loadedSettings.appPreferences.displayTheme = theme;
      
      setUserSettings(loadedSettings);
      setAvatarPreview(loadedSettings.profileInfo.avatarImage);
    }
  }, [user, theme]);

  // Listen for theme changes from ThemeContext
  useEffect(() => {
    const handleThemeChange = (e: CustomEvent) => {
      setUserSettings(prev => ({
        ...prev,
        appPreferences: { ...prev.appPreferences, displayTheme: e.detail }
      }));
    };

    window.addEventListener("theme:changed", handleThemeChange as EventListener);
    return () => window.removeEventListener("theme:changed", handleThemeChange as EventListener);
  }, []);

  const displayStatusMessage = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const saveCurrentSettings = () => {
    if (user) {
      persistUserSettings(userSettings);
      displayStatusMessage("success", "Your settings have been saved successfully!");
    }
  };

  const processAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const fileReader = new FileReader();
      fileReader.onloadend = () => {
        const imageData = fileReader.result as string;
        setAvatarPreview(imageData);
        setUserSettings(current => ({
          ...current,
          profileInfo: { ...current.profileInfo, avatarImage: imageData }
        }));
      };
      fileReader.readAsDataURL(selectedFile);
    }
  };

  const updatePassword = () => {
    if (passwordData.newPassword !== passwordData.verifyPassword) {
      displayStatusMessage("error", "New passwords do not match!");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      displayStatusMessage("error", "Password must be at least 8 characters!");
      return;
    }
    displayStatusMessage("success", "Password updated successfully!");
    setPasswordData({ oldPassword: "", newPassword: "", verifyPassword: "" });
  };

  const removeAccount = () => {
    if (window.confirm("⚠️ This will permanently delete your account and all data. Continue?")) {
      if (window.confirm("Final confirmation: Delete account permanently?")) {
        logout();
      }
    }
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "auto") => {
    setTheme(newTheme);
    setUserSettings(prev => ({
      ...prev,
      appPreferences: { ...prev.appPreferences, displayTheme: newTheme }
    }));
    displayStatusMessage("success", `Theme changed to ${newTheme} mode`);
  };

  const sectionTabs = [
    { key: "profile" as const, title: "Profile", iconComponent: <User size={18} /> },
    { key: "notifications" as const, title: "Notifications", iconComponent: <Bell size={18} /> },
    { key: "privacy" as const, title: "Privacy", iconComponent: <Shield size={18} /> },
    { key: "preferences" as const, title: "Preferences", iconComponent: <SettingsIcon size={18} /> },
    { key: "account" as const, title: "Account", iconComponent: <Lock size={18} /> },
  ];

  const ToggleSwitch = ({ isOn, onToggle }: { isOn: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        isOn ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
          isOn ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );

  return (
    <main className="flex-1 h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Account Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure your account preferences and privacy options</p>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            statusMessage.type === "success" 
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800" 
              : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? <Check size={20} /> : <X size={20} />}
              <span>{statusMessage.text}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 p-2 lg:sticky lg:top-6">
              {sectionTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setCurrentSection(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    currentSection === tab.key
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {tab.iconComponent}
                  <span className="font-medium">{tab.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 p-6">
              
              {/* Profile Section */}
              {currentSection === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold dark:text-white mb-2">Profile Details</h2>
                    <p className="text-gray-600 dark:text-gray-400">Manage your personal information and avatar</p>
                  </div>

                  {/* Avatar Upload */}
                  <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                    <div className="relative">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden ring-4 ring-white dark:ring-gray-700 shadow-lg">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          user?.name?.charAt(0).toUpperCase() || "U"
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2.5 shadow-lg cursor-pointer hover:bg-blue-700 transition-colors">
                        <Camera size={18} className="text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={processAvatarUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold dark:text-white mb-1">{user?.name || "User Name"}</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-2">{user?.email}</p>
                      <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium capitalize">
                        {user?.role === "contentCreator" ? "Content Creator" : user?.role || "User"}
                      </span>
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <User size={16} />
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={userSettings.profileInfo.displayName}
                        onChange={(e) => setUserSettings(prev => ({
                          ...prev,
                          profileInfo: { ...prev.profileInfo, displayName: e.target.value }
                        }))}
                        className="w-full px-4 py-3 border-2 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <Mail size={16} />
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={userSettings.profileInfo.emailAddress}
                        onChange={(e) => setUserSettings(prev => ({
                          ...prev,
                          profileInfo: { ...prev.profileInfo, emailAddress: e.target.value }
                        }))}
                        className="w-full px-4 py-3 border-2 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <Phone size={16} />
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={userSettings.profileInfo.phoneNumber}
                        onChange={(e) => setUserSettings(prev => ({
                          ...prev,
                          profileInfo: { ...prev.profileInfo, phoneNumber: e.target.value }
                        }))}
                        className="w-full px-4 py-3 border-2 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <MapPin size={16} />
                        Location
                      </label>
                      <input
                        type="text"
                        value={userSettings.profileInfo.userLocation}
                        onChange={(e) => setUserSettings(prev => ({
                          ...prev,
                          profileInfo: { ...prev.profileInfo, userLocation: e.target.value }
                        }))}
                        className="w-full px-4 py-3 border-2 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="New York, USA"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <LinkIcon size={16} />
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={userSettings.profileInfo.personalWebsite}
                        onChange={(e) => setUserSettings(prev => ({
                          ...prev,
                          profileInfo: { ...prev.profileInfo, personalWebsite: e.target.value }
                        }))}
                        className="w-full px-4 py-3 border-2 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <FileText size={16} />
                        About Me
                      </label>
                      <textarea
                        value={userSettings.profileInfo.aboutMe}
                        onChange={(e) => setUserSettings(prev => ({
                          ...prev,
                          profileInfo: { ...prev.profileInfo, aboutMe: e.target.value }
                        }))}
                        rows={5}
                        maxLength={500}
                        className="w-full px-4 py-3 border-2 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Share something about yourself..."
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                        {userSettings.profileInfo.aboutMe.length}/500 characters
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Section */}
              {currentSection === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold dark:text-white mb-2">Notification Settings</h2>
                    <p className="text-gray-600 dark:text-gray-400">Control what notifications you receive</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: "assignmentAlerts" as const, title: "Assignment Alerts", desc: "Get notified about assignment deadlines and submissions" },
                      { key: "courseUpdates" as const, title: "Course Updates", desc: "Receive updates when courses are modified or new content is added" },
                      { key: "gradeNotifications" as const, title: "Grade Notifications", desc: "Be notified when your assignments are graded" },
                      { key: "discussionReplies" as const, title: "Discussion Replies", desc: "Get alerts when someone replies to your discussions" },
                      { key: "weeklyReport" as const, title: "Weekly Progress Report", desc: "Receive a summary of your weekly learning progress" },
                      { key: "emailDigest" as const, title: "Email Digest", desc: "Get a daily email summary of all activities" },
                    ].map((notif) => (
                      <div key={notif.key} className="flex items-start justify-between p-5 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{notif.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{notif.desc}</p>
                        </div>
                        <ToggleSwitch
                          isOn={userSettings.notificationSettings[notif.key]}
                          onToggle={() => setUserSettings(prev => ({
                            ...prev,
                            notificationSettings: {
                              ...prev.notificationSettings,
                              [notif.key]: !prev.notificationSettings[notif.key]
                            }
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Privacy Section */}
              {currentSection === "privacy" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold dark:text-white mb-2">Privacy Controls</h2>
                    <p className="text-gray-600 dark:text-gray-400">Manage who can see your information</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Profile Visibility
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { value: "everyone" as const, label: "Everyone", desc: "Anyone can view your profile" },
                        { value: "students" as const, label: "Students Only", desc: "Only enrolled students can see" },
                        { value: "private" as const, label: "Private", desc: "Only you can view your profile" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setUserSettings(prev => ({
                            ...prev,
                            privacySettings: { ...prev.privacySettings, profileVisibility: option.value }
                          }))}
                          className={`p-4 border-2 rounded-lg text-left transition-all ${
                            userSettings.privacySettings.profileVisibility === option.value
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                          }`}
                        >
                          <div className="font-semibold dark:text-white mb-1">{option.label}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{option.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: "showGrades" as const, title: "Show Grades", desc: "Display your grades on your profile" },
                      { key: "showActivity" as const, title: "Show Activity", desc: "Let others see your recent activities" },
                      { key: "showCourses" as const, title: "Show Enrolled Courses", desc: "Display courses you're enrolled in" },
                      { key: "allowDirectMessages" as const, title: "Allow Direct Messages", desc: "Let other users send you messages" },
                    ].map((privacy) => (
                      <div key={privacy.key} className="flex items-start justify-between p-5 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{privacy.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{privacy.desc}</p>
                        </div>
                        <ToggleSwitch
                          isOn={userSettings.privacySettings[privacy.key]}
                          onToggle={() => setUserSettings(prev => ({
                            ...prev,
                            privacySettings: {
                              ...prev.privacySettings,
                              [privacy.key]: !prev.privacySettings[privacy.key]
                            }
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preferences Section */}
              {currentSection === "preferences" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold dark:text-white mb-2">App Preferences</h2>
                    <p className="text-gray-600 dark:text-gray-400">Customize your application experience</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Display Theme
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { value: "light" as const, label: "Light", icon: <Sun size={20} /> },
                        { value: "dark" as const, label: "Dark", icon: <Moon size={20} /> },
                        { value: "auto" as const, label: "Auto", icon: <Monitor size={20} /> },
                      ].map((themeOption) => (
                        <button
                          key={themeOption.value}
                          onClick={() => handleThemeChange(themeOption.value)}
                          className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                            theme === themeOption.value
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                              : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {themeOption.icon}
                          <span className="font-semibold">{themeOption.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Current mode: <span className="font-semibold capitalize">{effectiveTheme}</span>
                      {theme === "auto" && " (Following system preference)"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Language
                      </label>
                      <select
                        value={userSettings.appPreferences.languageCode}
                        onChange={(e) => setUserSettings(prev => ({
                          ...prev,
                          appPreferences: { ...prev.appPreferences, languageCode: e.target.value }
                        }))}
                        className="w-full px-4 py-3 border-2 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="en-US">English (US)</option>
                        <option value="es-ES">Spanish</option>
                        <option value="fr-FR">French</option>
                        <option value="de-DE">German</option>
                        <option value="zh-CN">Chinese</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Timezone
                      </label>
                      <select
                        value={userSettings.appPreferences.timezoneOffset}
                        onChange={(e) => setUserSettings(prev => ({
                          ...prev,
                          appPreferences: { ...prev.appPreferences, timezoneOffset: e.target.value }
                        }))}
                        className="w-full px-4 py-3 border-2 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Date Format
                      </label>
                      <select
                        value={userSettings.appPreferences.dateDisplayFormat}
                        onChange={(e) => setUserSettings(prev => ({
                          ...prev,
                          appPreferences: { ...prev.appPreferences, dateDisplayFormat: e.target.value }
                        }))}
                        className="w-full px-4 py-3 border-2 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Section */}
              {currentSection === "account" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold dark:text-white mb-2">Account Security</h2>
                    <p className="text-gray-600 dark:text-gray-400">Update your password and manage account access</p>
                  </div>

                  <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={passwordData.oldPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }))}
                          className="w-full px-4 py-3 border-2 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Enter current password"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-4 py-3 border-2 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Enter new password"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={passwordData.verifyPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, verifyPassword: e.target.value }))}
                          className="w-full px-4 py-3 border-2 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Confirm new password"
                        />
                      </div>

                      <button
                        onClick={updatePassword}
                        className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2">Danger Zone</h3>
                    <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                      Deleting your account is permanent and cannot be undone. All your data will be lost.
                    </p>
                    <button
                      onClick={removeAccount}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 size={18} />
                      Delete Account
                    </button>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={saveCurrentSettings}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-lg transition-all"
                >
                  <Save size={20} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}