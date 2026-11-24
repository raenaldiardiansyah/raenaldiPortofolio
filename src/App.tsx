import { useEffect } from "react";
import { Redirect, Route, Switch } from "wouter";
import { MotionConfig } from "motion/react";
import { splashReady } from "./lib/splash";
import Home from "./pages/Home";
import Project from "./pages/Project";
import NotFound from "./pages/not-found";

export default function App() {
  // Every page is ready on first render except the desktop home, which loads its code first and says so itself.
  useEffect(() => {
    if (location.pathname !== "/" || !matchMedia("(min-width: 768px)").matches) splashReady();
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/work/:slug" component={Project} />
        {/* Addresses of the old project pages, kept so existing links still land somewhere. */}
        <Route path="/AGV-LineFollower">
          <Redirect to="/work/agv-line-follower" replace />
        </Route>
        <Route path="/Smart-Lock Door">
          <Redirect to="/work/smart-lock" replace />
        </Route>
        <Route path="/Bojong-Travel">
          <Redirect to="/work/bojong-travel" replace />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </MotionConfig>
  );
}
