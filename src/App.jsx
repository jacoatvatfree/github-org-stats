import { useState } from "react";
import LoginForm from "./components/LoginForm";
import Dashboard from "./components/Dashboard";

function App() {
  const [credentials, setCredentials] = useState(null);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {!credentials ? (
        <LoginForm onSubmit={setCredentials} />
      ) : (
        <Dashboard
          credentials={credentials}
          onReset={() => setCredentials(null)}
        />
      )}
    </div>
  );
}

export default App;
