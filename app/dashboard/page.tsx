import Navbar from "../components/Navbar";

export default function dashboard() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-white text-4xl font-bold">Dashboard</h1>
      </div>
    </>
  );
}
