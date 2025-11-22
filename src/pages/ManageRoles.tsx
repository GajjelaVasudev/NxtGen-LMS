// src/pages/ManageRoles.tsx
export default function ManageRoles() {
  return (
    <main className="flex-1 p-6 min-h-0 overflow-y-auto bg-white">
      <div>
        <h1 className="text-2xl font-bold text-nxtgen-text-primary mb-6">
          Manage Roles
        </h1>

        {/* Example: Report cards or charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-nxtgen-border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Report 1</h3>
            <p>Some data or chart here</p>
          </div>
          <div className="bg-white border border-nxtgen-border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Report 2</h3>
            <p>Some data or chart here</p>
          </div>
        </div>
      </div>
    </main>
  );
}
