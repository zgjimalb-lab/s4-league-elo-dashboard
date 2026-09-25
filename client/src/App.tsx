import { Route, Switch } from 'wouter';
import ErrorBoundary from '@/components/ErrorBoundary';
import Layout from '@/components/Layout';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ScopeProvider } from '@/lib/s4/scope';
import DuelPage from '@/pages/DuelPage';
import DuosPage from '@/pages/DuosPage';
import EloPage from '@/pages/EloPage';
import Leaderboard from '@/pages/Leaderboard';
import MatchesPage from '@/pages/MatchesPage';
import NotFound from '@/pages/NotFound';
import PlayerPage from '@/pages/PlayerPage';

export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={200}>
        <ScopeProvider>
          <Layout>
            <Switch>
              <Route path="/" component={Leaderboard} />
              <Route path="/elo" component={EloPage} />
              <Route path="/spieler" component={PlayerPage} />
              <Route path="/spieler/:name" component={PlayerPage} />
              <Route path="/matches" component={MatchesPage} />
              <Route path="/duell" component={DuelPage} />
              <Route path="/duos" component={DuosPage} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </ScopeProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
