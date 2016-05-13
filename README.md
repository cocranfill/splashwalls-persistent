# splashwalls-persistent

This is an update to the tutorial written by Nash Vail, which you can find here:

https://www.smashingmagazine.com/2016/04/the-beauty-of-react-native-building-your-first-ios-app-with-javascript-part-1/

As you might guess by the name, this update adds the following features:

  1. The ability to persistently store data fetched across the network using the React Native AsyncStorage API
  2. Upon starting, the app now checks to see if it has access to on-device data; if it does, it uses that data instead of a network fetch
  3. If using on-device data, the loading screen is not shown
  4. Aging: If on-device data is present and exactly a week old in local time, the app fetches new data across the network

A future update might include a better aging mechanism; the first change would be to disregard the hours, minutes and seconds in the aging timestamp. A finer-grained aging mechanism is also envisioned where only data that has changed is pulled across the network instead of the entire list of data.
