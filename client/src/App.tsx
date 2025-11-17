import { Route, Switch } from 'wouter';
import Dashboard from '@/pages/Dashboard';
import NotFound from '@/pages/NotFound';

function App() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
