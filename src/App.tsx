import { HomePage } from './pages/HomePage';

type AppProps = {
  initialRecoveryToken: string | null;
};

export default function App({ initialRecoveryToken }: AppProps) {
  return <HomePage initialRecoveryToken={initialRecoveryToken} />;
}
