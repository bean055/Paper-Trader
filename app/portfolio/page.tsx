
import "../../styles/pages/portfolio.css"
import Navbar from "../components/Navbar"
import "../../styles/global.css";

export default function Portfolio() {
  return (
    <>
    <Navbar/>
    <div className="min-h-screen bg-gray-500 flex items-center justify-center">
      <h1 className="text-white text-4xl font-bold">Welcome to Paper Trader</h1>
    </div>
    </>
  );
}
