import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const AdminSidebar: React.FC = () => {
  const { t } = useTranslation();
  const menuItems = [
    { key: "dashboard", path: "/admin", icon: "📊", current: true },
    { key: "users", path: "/admin/users", icon: "👥", current: false },
    { key: "statistics", path: "/admin/statistics", icon: "📈", current: false },
    { key: "settings", path: "/admin/settings", icon: "⚙️", current: false },
  ];

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden h-full">
      <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600">
        <h2 className="text-xl font-bold text-white">{t("admin.panelTitle")}</h2>
        <p className="text-indigo-100 text-sm mt-1">
          {t("admin.panelSubtitle")}
        </p>
      </div>
      
      <div className="py-4">
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.key}
              to={item.path}
              className={`group flex items-center px-6 py-3 text-sm font-medium ${
                item.current
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {t(`admin.nav.${item.key}`)}
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700">Note</h3>
          <p className="mt-1 text-xs text-gray-500">
            This sidebar is prepared for future navigation. 
            Additional admin sections will be implemented as needed.
          </p>
        </div>
      </div>
    </div>
  );
}; 