import React from 'react';
import AppSidebar from './AppSidebar';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 p-6">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
