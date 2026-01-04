"use client";
import ProtectedLayout from "../components/ProtectedLayout";
import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";

const DEFAULT_CATEGORIES = [
  { id: "salaries", name: "Salaries & Wages", enabled: true },
  { id: "rent", name: "Rent", enabled: true },
  { id: "electricity", name: "Electricity", enabled: true },
  { id: "phone", name: "Phone & Internet", enabled: true },
  { id: "pettyCash", name: "Petty Cash", enabled: true },
  { id: "maintenance", name: "Maintenance & Repairs", enabled: true },
  { id: "miscellaneous", name: "Miscellaneous", enabled: true },
];

type Category = {
  id: string;
  name: string;
  enabled: boolean;
};

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedCategories = localStorage.getItem("kam_aid_expense_categories");
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    } else {
      setCategories(DEFAULT_CATEGORIES);
    }
  }, []);

  // Toggle category enabled/disabled
  const toggleCategory = (id: string) => {
    setCategories(categories.map(cat =>
      cat.id === id ? { ...cat, enabled: !cat.enabled } : cat
    ));
    setSaved(false);
  };

  // Add new category
  const addCategory = () => {
    if (newCategoryName.trim()) {
      const newId = newCategoryName.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
      setCategories([...categories, {
        id: newId,
        name: newCategoryName.trim(),
        enabled: true
      }]);
      setNewCategoryName("");
      setSaved(false);
    }
  };

  // Remove category
  const removeCategory = (id: string) => {
    // Don't allow removing default categories
    const isDefault = DEFAULT_CATEGORIES.some(cat => cat.id === id);
    if (isDefault) {
      alert("Cannot remove default categories. You can disable them instead.");
      return;
    }
    setCategories(categories.filter(cat => cat.id !== id));
    setSaved(false);
  };

  // Save settings
  const saveSettings = () => {
    localStorage.setItem("kam_aid_expense_categories", JSON.stringify(categories));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    if (confirm("Are you sure you want to reset to default categories? Custom categories will be removed.")) {
      setCategories(DEFAULT_CATEGORIES);
      localStorage.removeItem("kam_aid_expense_categories");
      setSaved(false);
    }
  };

  return (
    <ProtectedLayout>
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Settings</h1>
        <p className="text-slate-500">Manage expense categories and preferences</p>
      </div>

      {/* Expense Categories */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Expense Categories</h2>
            <p className="text-sm text-slate-500 mt-1">Toggle categories on/off or add custom ones</p>
          </div>
          <button
            onClick={resetToDefaults}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Reset to defaults
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {categories.map((category) => {
            const isDefault = DEFAULT_CATEGORIES.some(cat => cat.id === category.id);
            return (
              <div
                key={category.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  category.enabled
                    ? "bg-white border-slate-200"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                <GripVertical className="w-5 h-5 text-slate-300" />
                
                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={category.enabled}
                    onChange={() => toggleCategory(category.id)}
                    className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                  />
                  <span className={`font-medium ${category.enabled ? "text-slate-800" : "text-slate-400"}`}>
                    {category.name}
                  </span>
                  {isDefault && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                      Default
                    </span>
                  )}
                </label>

                {!isDefault && (
                  <button
                    onClick={() => removeCategory(category.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add New Category */}
        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <input
            type="text"
            placeholder="New category name..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addCategory()}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
          <button
            onClick={addCategory}
            className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">About</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">App Name</span>
            <span className="font-medium text-slate-800">KAM AID Financial Platform</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Version</span>
            <span className="font-medium text-slate-800">1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Branches</span>
            <span className="font-medium text-slate-800">Oyarifa, Ghana Flag, Madina</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500">Data Storage</span>
            <span className="font-medium text-slate-800">Local (Browser)</span>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Data Management</h2>
        <div className="space-y-4">
          <button
            onClick={() => {
              const data = {
                reports: JSON.parse(localStorage.getItem("kam_aid_reports") || "[]"),
                categories: JSON.parse(localStorage.getItem("kam_aid_expense_categories") || "[]")
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `kam_aid_backup_${new Date().toISOString().split("T")[0]}.json`;
              a.click();
            }}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors text-left"
          >
            📦 Export All Data (Backup)
          </button>
          <button
            onClick={() => {
              if (confirm("⚠️ This will delete ALL your saved reports and settings. This cannot be undone. Are you sure?")) {
                localStorage.removeItem("kam_aid_reports");
                localStorage.removeItem("kam_aid_expense_categories");
                setCategories(DEFAULT_CATEGORIES);
                alert("All data has been cleared.");
              }
            }}
            className="w-full px-4 py-3 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors text-left"
          >
            🗑️ Clear All Data
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-white font-medium shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 transition-all flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>

      {/* Saved Toast */}
      {saved && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in">
          <span className="text-emerald-400">✓</span>
          Settings saved successfully!
        </div>
      )}
    </div>
    </ProtectedLayout>
  );
}