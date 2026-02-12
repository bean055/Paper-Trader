import "../styles/global.css";
import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
         position="top-right"
         expand={true}
         richColors
        />
      </body>
    </html>
  );
}

