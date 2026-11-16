import { Redirect, Route, Switch } from "wouter";
import Home from "./pages/Home";
import Project from "./pages/Project";
import NotFound from "./pages/not-found";

export default function App() {
  return (
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
  );
}
