import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ConversationProvider } from './context/ConversationContext';
import { AIProvider } from './context/AIContext';
import { SidebarProvider } from './context/SidebarContext';
import CreateWorkspaceModal from './components/CreateWorkspaceModal';
import AIChatDrawer from './components/AIChatDrawer';
import CmdKModal from './components/CmdKModal';
import AIFloatingTrigger from './components/AIFloatingTrigger';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'AI Code-Space | Prompt-to-Action Workspace',
  description: 'AI-driven Workspace, Project, and Task Collaboration Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground min-h-screen antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <ConversationProvider>
                <SidebarProvider>
                  <AIProvider>
                    {children}
                    <CreateWorkspaceModal />
                    <AIChatDrawer />
                    <CmdKModal />
                    <AIFloatingTrigger />
                  </AIProvider>
                </SidebarProvider>
              </ConversationProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
