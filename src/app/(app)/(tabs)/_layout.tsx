import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'networks', title: 'Networks', icon: 'people-outline' },
  { name: 'search', title: 'Search', icon: 'search-outline' },
  { name: 'study', title: 'Study', icon: 'albums-outline' },
  { name: 'events', title: 'Events', icon: 'calendar-outline' },
  { name: 'settings', title: 'Settings', icon: 'settings-outline' },
];

export default function TabsLayout() {
  return (
    <Tabs>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: `${tab.title} tab`,
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name={tab.icon}
                size={size}
                color={typeof color === 'string' ? color : undefined}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
