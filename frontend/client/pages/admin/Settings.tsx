import { Settings, Database, Lock, Mail, Bell, Sliders } from "lucide-react";

export default function AdminSettings() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">System Settings</h1>
        <p className="text-gray-600">Configure system behavior and integrations</p>
      </div>

      <div className="space-y-8">
        {/* General Settings */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">General Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Organization Name</label>
              <input type="text" defaultValue="SafeCommunityAI Emergency Services" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Default Response Time Target</label>
              <input type="text" defaultValue="5 minutes" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Save Changes</button>
          </div>
        </div>

        {/* Database Settings */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Database</h2>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="font-medium text-green-900">Status: Connected</p>
              <p className="text-sm text-green-700 mt-1">Database is operational and responding</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Last Backup</p>
                <p className="text-gray-600">Today at 2:30 AM</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Database Size</p>
                <p className="text-gray-600">2.4 GB</p>
              </div>
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Backup Now</button>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900">Security</h2>
          </div>
          <div className="space-y-4">
            {[
              { name: "Two-Factor Authentication", enabled: true },
              { name: "IP Whitelisting", enabled: false },
              { name: "Rate Limiting", enabled: true },
              { name: "API Key Rotation", enabled: true },
            ].map((setting) => (
              <div key={setting.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{setting.name}</p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked={setting.enabled} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-6 h-6 text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-900">Email Notifications</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">SMTP Server</label>
              <input type="text" defaultValue="smtp.example.com" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">From Address</label>
              <input type="email" defaultValue="alerts@safecommunityai.com" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Send Test Email</button>
          </div>
        </div>

        {/* Alert Settings */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-900">Alert Thresholds</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Response Time Alert</label>
              <input type="text" defaultValue="10 minutes" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Pending Incident Threshold</label>
              <input type="text" defaultValue="5 incidents" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Save Thresholds</button>
          </div>
        </div>
      </div>
    </div>
  );
}
