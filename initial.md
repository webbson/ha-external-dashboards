I'm going to build a Home Assistant HACS Integration for building and displaying dashboards outside of Home Assistant.

It should be built using Vite and React 19 with Router. The design framework for the management interface should be built using Ant Design https://ant.design/. 

All data should be stored in a database and be persistant and backupable by Home assistant built in backup. The database should have functionality to migrate to newer versions of the markup automatically, maybe an orm?

All editing should be interactive with a live preview of how it is going to look.

# Management interface
Should only be reachable from the Home Assistant sidebar with a "External dashboards" menu item.

Should be able to create 
- Dashboards
- Layouts (used in dashboard to design the layout)
- Components (to be used in the layouts in various placeholders)
- Assets (user can upload or edit assets that should be able to use in components or dashboards, for example images)
- Trigger popups

## Components
This is the basic parts of the dashboards. 
The user will be able to build the components with a live preview and select parameters that should be set when adding it to a Dashboard. Building the components should be done with some kind of templating language.

Components will get their data from Home Assistant entities, either selectable via single entity, multiple entities  (either via selection or via globs/wildcards, areas, tags etc). We should be able to show data from both states and attributes. 

The user should be able to add parameters that change how the component is rendered. 

From the start we will provide a set of pre-built components to the user for some basic use cases. 

Components can either get their styling from themselves or via global variables inherited from dashboards. 

There should even be components which can hold other components, for example a tabbed component to add different values inside of them, or a auto rotate component which switches visible components on a timer.


## Layouts
Layouts determine how the components can be added on a dashboard. For example a top area, left column, right column and a footer area. We can determine the sizing of them. 

## Dashboards

Dashboards consist of one or many layouts. If many the user can select how to switch between the layouts, either via some kind of tab bar, or auto rotate. 

When adding a component to a layout in the dashboard they should have the possibility to be shown via visibility rules, for example if an entity has state/attribute of certain values, this should be able to set once added to a dashboard. 


Dashboards carry global styling variables that control how the components/layouts are rendered. 

Access to dashboards are served on a seperate port, and they can either have a randomly generated slug or a custom one.
Dashboards can be public or private (protected either by basic auth, header or a password prompt)
By default dashboards will only be able to show values from Home Assistant, we can activate interactive mode, which allows controlling the state of entities as well. There should be a warning about this if the dashboard is set to public.

When saving a dashboard, all displays which are showing that dashboard should be auto reloaded.

# Security

We will create a proxy for communication via websockets. Dashboards will only get updates for entities which are used in that dashboard. When interactive mode is active, we should forward the command to home assistant, after first validating that the dashboard is in interactive mode and has access to that entity. Access to the websocket should be using a unique access key for that dashboard, so no one can try to trick the proxy.

# Popups
It should be able to send popups with a message to be shown on all displays showing a dashboard.
We should be able to show text or images/video. A timeout should be able to be set how long the popup should be shown.

This should also be exposed to Home Assistant so that we can send notifications from there.
