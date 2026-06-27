import { Bell, Lock, User, LogOut } from "lucide-react";

export default function Settings() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      {/* Profile Settings */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Full Name</label>
            <input type="text" defaultValue="John Responder" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
            <input type="email" defaultValue="responder@demo.com" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Phone</label>
            <input type="tel" defaultValue="555-1234" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Organization</label>
            <input type="text" defaultValue="Central Fire Department" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
            Save Changes
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
        </div>

        <div className="space-y-4">
          {[
            { label: "Emergency Alerts", desc: "Get notified of new emergency assignments" },
            { label: "Message Notifications", desc: "Notifications for new messages" },
            { label: "System Alerts", desc: "Important system notifications" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">Security</h2>
        </div>

        <div className="space-y-4">
          <button className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-900 flex justify-between items-center">
            Change Password
            <span className="text-gray-400">→</span>
          </button>
          <button className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-900 flex justify-between items-center">
            Two-Factor Authentication
            <span className="text-green-600 text-xs font-bold">ENABLED</span>
          </button>
          <button className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-900 flex justify-between items-center">
            Login Activity
            <span className="text-gray-400">→</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow p-6 border-l-4 border-red-600">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <LogOut className="w-6 h-6 text-red-600" />
          Danger Zone
        </h2>

        <button className="px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium border border-red-300">
          Log Out of All Devices
        </button>
      </div>
    </div>
  );
}
