import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import NotFound from "./pages/not-found";
import Home from "./pages/Home";
import AGVLineFollower from "./pages/AGV-LineFollower";
import SmartLockDoor from "./pages/Smart-Lock Door";
import BojongTravel from "./pages/Bojong-Travel"
import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';


gsap.registerPlugin(ScrollTrigger);

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/AGV-LineFollower" component={AGVLineFollower} />
      <Route path="/Smart-Lock Door" component={SmartLockDoor} />
      <Route path="/Bojong-Travel" component={BojongTravel} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    ScrollTrigger.refresh();
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;