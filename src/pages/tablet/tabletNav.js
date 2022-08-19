import { h } from "preact"
import { useEffect, useState } from "preact/hooks"
import { iconsFeather } from "../../components/Images"
import { iconsTarget } from "../../targets"
import { T } from "../../components/Translations"
import { useUiContext, useUiContextFn } from "../../contexts"

const tabletMenu = ({sendHomeCommand, sendCommand, gCodeLoaded}) => [
    {icon: "Maximize", name: "Fullscreen", id: "fullscreen", function: ""},
    {icon: "Home", name: "Homing", id: "homing", function: () => sendHomeCommand("")},
    {icon: "Home", name:  "Home A", id: "home-a", function: () => sendHomeCommand("A")},
    {icon: "Power", name: "Spindle Off", id: "spindle-off", function: () => sendCommand("M5")},
    {icon: "Unlock", name: "Unlock", id: "unlock", function: () => sendCommand("$X")},
    {icon: "XCircle", name: "Reset", id: "reset", function: () => sendCommand("#SOFTRESET#")}
]

const green = '#86f686';
const red = '#f64646';
const gray = '#f6f6f6';

const buttonStates = ({startGcode, sendCommand}) => {
    return {
    '?': {
        left: [true, gray, 'Start', null],
        right: [false, gray, 'Pause', null]
    },
    sleep: {},
    alarm: {
        left: [true, gray, 'Start', null],
        right: [false, gray, 'Pause', null]
    },
    idleWithGcode: {
        left: [true, green, 'Start', () => startGcode()],
        right: [false, gray, 'Pause', null]
    },
    idleNoGcode: {
        left: [false, gray, 'Start', null],
        right: [false, gray, 'Pause', null]
    },
    hold: {
        left: [true, green, 'Resume', () => sendCommand('#CYCLESTART#')],
        right: [true, red, 'Stop', () => sendCommand('#SOFTRESET#')]
    },
    jog: {},
    home: {},
    run: {
        left: [false, gray, 'Start', null],
        right: [true, red, 'Pause', () => sendCommand('#FEEDHOLD#')]
    },
    check: {
        left: [true, gray, 'Start', null],
        right: [true, red, 'Stop', () => sendCommand('#SOFTRESET#')]
    }
}};

const TabletNav = ({status = {state: 'idle'}, sendHomeCommand, sendCommand, gCodeLoaded, startGcode}) => {
    const iconsList = { ...iconsTarget, ...iconsFeather }

    const [leftButton, setLeftButton] = useState([false, gray, 'Start', null]);
    const [rightButton, setRightButton] = useState([false, gray, 'Pause', null]);
    const [clock, setClock] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    
    useEffect(() => {
        let transformedState;
        if (status.state == 'idle') {
            transformedState = gCodeLoaded ? 'idleWithGcode' : 'idleNoGcode';
        } else {
            transformedState = status.state;
        }
        setLeftButton(buttonStates({startGcode, sendCommand})[transformedState].left);
        setRightButton(buttonStates({startGcode, sendCommand})[transformedState].right);
    }, [status, gCodeLoaded])

    function refreshClock() {
      setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    useEffect(() => {
      const clockId = setInterval(refreshClock, 1000);
      return function cleanup() {
        clearInterval(clockId);
      };
    }, []);
    
    return (
        <div class="container">
            <div class="columns" style={{padding: '5px 10px'}}>
            <div id="time-of-day" class="column col-1 text-center">
                {clock}
            </div>
            <div id="active-state" class="column col-2 col-mx-auto text-center">
                State: {status.state ? status.state : "No state available"}
            </div>
            <div id="run-buttons" class="column col-4 col-mx-auto columns">
                <button
                    disabled={!leftButton[0]}
                    class="btn btn-lg column col-4 col-mx-auto"
                    onClick={() => leftButton[3]()}
                    style={{
                        backgroundColor: leftButton[1],
                        color: leftButton[0] ? 'black' : 'inherit',
                        borderColor:  leftButton[0] ? 'black' : 'inherit'
                    }}
                >
                    {leftButton[2]}
                </button>
                <button
                    disabled={!rightButton[0]}
                    class="btn btn-lg column col-4 col-mx-auto"
                    onClick={() => rightButton[3]()}
                    style={{
                        backgroundColor: rightButton[1],
                        color: rightButton[0] ? 'black' : 'inherit',
                        borderColor:  rightButton[0] ? 'black' : 'inherit'
                    }}
                >
                    {rightButton[2]}
                </button>
            </div>
            <div id="runtime" class="column col-1 text-center">
                0:00
            </div>
            <div id="menu" class="column col-1 text-center">
                <div class="dropdown dropdown-right">
                    <span
                        class="dropdown-toggle btn btn-lg tooltip tooltip-left m-1"
                        tabindex="0"
                        style="z-index: 10000"
                        data-tooltip={T("menu")}
                        onclick={() => {
                            useUiContextFn.haptic()
                        }}
                  >
                        Menu
                    </span>
                        <ul class="menu">
                            {tabletMenu({sendHomeCommand, sendCommand}).map((panel) => {
                                const displayIcon = iconsList[panel.icon]
                                    ? iconsList[panel.icon]
                                    : ""
                                return (
                                    <li class="menu-item">
                                        <div
                                            class="menu-entry"
                                            onclick={(e) => {
                                                useUiContextFn.haptic()
                                                panel.function()
                                            }}
                                      >
                                            <div class="menu-panel-item">
                                                <span class="menu-panel-item feather-icon-container">
                                                    {displayIcon}
                                                    <span class="text-menu-item">
                                                        {T(panel.name)}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
            </div>
            </div>
        </div>
    )
}

export default TabletNav;
