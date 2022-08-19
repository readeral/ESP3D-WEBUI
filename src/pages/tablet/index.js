
import { h } from "preact"
import { useEffect, useState } from "preact/hooks"
import { useHttpFn } from "../../hooks"

import TabletNav from "./tabletNav";
import PositionPanel from "./positionPanel";
import JogPanel from "./jogPanel";
import MDIpanel from "./MDIPanel";

import { espHttpURL, replaceVariables } from "../../components/Helpers"
import { useUiContext, useUiContextFn } from "../../contexts"
import { useTargetContext, variablesList } from "../../targets"

const Tablet = () => {
    const { modals, toasts } = useUiContext()
    const { createNewRequest } = useHttpFn;
    const targetContext = useTargetContext();

    const [units, setUnits] = useState('mm')
    const [gCodeLoaded, setGCodeLoaded] = useState(false)

    let currentFeedRate = {};

    function startGcode() {
        useUiContextFn.haptic()
        const cmd =
        files.command(
            currentFS,
            "play",
            currentPath[
                currentFS
            ],
            line.name
        )
        sendSerialCmd(
            cmd.cmd
        )
    }

    useEffect(() => { //@todo does this need changing to allow the feedrate to be updated? as per XY example below
        if (!currentFeedRate["XY"] || useUiContextFn.getValue("xyfeedrate") !== currentFeedRate["XY"])
            currentFeedRate["XY"] = useUiContextFn.getValue("xyfeedrate")
        if (!currentFeedRate["Z"])
            currentFeedRate["Z"] = useUiContextFn.getValue("zfeedrate")
        if (!currentFeedRate["A"])
            currentFeedRate["A"] = useUiContextFn.getValue("afeedrate")
        if (!currentFeedRate["B"])
            currentFeedRate["B"] = useUiContextFn.getValue("bfeedrate")
        if (!currentFeedRate["C"])
            currentFeedRate["C"] = useUiContextFn.getValue("cfeedrate")
    }, [currentFeedRate])

    //Send a request to the ESP
    const sendCommand = (command) => {
        createNewRequest(
            espHttpURL("command", {
                cmd: replaceVariables(variablesList.commands, command),
            }),
            {
                method: "GET",
                echo: replaceVariables(variablesList.commands, command, true), //need to see the command sent but keep the not printable command as variable
            },
            {
                onSuccess: (result) => {},
                onFail: (error) => {
                    toasts.addToast({ content: error, type: "error" })
                    console.log(error)
                },
            }
        )
    }

    //Send a series of commands to the ESP
    const sendSerialCmd = (command) => {
        const cmds = command.split(";")
        cmds.forEach((cmd) => {
            createNewRequest(
                espHttpURL("command", { cmd: cmd }),
                { method: "GET", echo: cmd },
                {
                    onSuccess: (result) => {
                        //Result is handled on ws so just do nothing
                    },
                    onFail: (error) => {
                        console.log(error)
                        processor.stopCatchResponse()
                        setIsLoading(false)
                        toasts.addToast({ content: error, type: "error" })
                    },
                }
            )
        })
    }

    //Send jog command
    const sendJogCommand = (axis, distance) => {
        let selected_axis
        let feedrate =
            axis.startsWith("X") || axis.startsWith("Y")
                ? currentFeedRate["XY"]
                : axis.startsWith("Z")
                ? currentFeedRate["Z"]
                : currentFeedRate[currentAxis]
        if (axis.startsWith("Axis"))
            selected_axis = axis.replace("Axis", currentAxis)
        else selected_axis = axis
        let cmd =
            "$J=G91 G21 " + selected_axis + distance + " F" + feedrate
         sendCommand(cmd)
    }

    //Send Home command
    const sendHomeCommand = (axis) => {
        let selected_axis
        if (axis == "Axis") selected_axis = currentAxis
        else selected_axis = axis
        const cmd = useUiContextFn
            .getValue("homecmd")
            .replace("#", selected_axis)
         sendCommand(cmd)
    }

    //Send Zero command
    const sendZeroCommand = (axis) => {
        let selected_axis
        if (axis == "Axis") selected_axis = currentAxis + "0"
        else selected_axis = axis + "0"
        if (axis.length == 0) {
            selected_axis = ""
            if (positions.x || positions.wx) selected_axis += " X0"
            if (positions.y || positions.wy) selected_axis += " Y0"
            if (positions.z || positions.wz) selected_axis += " Z0"
            if (positions.a || positions.wa) selected_axis += " A0"
            if (positions.b || positions.wb) selected_axis += " B0"
            if (positions.c || positions.wc) selected_axis += " C0"
        }
        const cmd = useUiContextFn
            .getValue("zerocmd")
            .replace("#", selected_axis.trim())
         sendCommand(cmd)
    }

    const stopAndRecover = () => {
    // stopGCode();
        // To stop GRBL you send a reset character, which causes some modes
        // be reset to their default values.  In particular, it sets G21 mode,
        // which affects the coordinate display and the jog distances.
    // requestModes(); // $G command returns the modes
    }

    return (
        <div id="tablet" class="container tablet">
            <TabletNav
                targetContext={targetContext}
                sendHomeCommand={sendHomeCommand}
                sendCommand={sendCommand}
                gCodeLoaded={gCodeLoaded}
                startGcode={startGcode}
            />
            <PositionPanel
                targetContext={targetContext}
                sendZeroCommand={sendZeroCommand}
                sendHomeCommand={sendHomeCommand}
                sendCommand={sendCommand}
                units={units}
                setUnits={setUnits}
            />
            <JogPanel
                targetContext={targetContext}
                sendJogCommand={sendJogCommand}
                units={units}/>
            <MDIpanel
                sendCommand={sendCommand}
                sendSerialCmd={sendSerialCmd}
                setGCodeLoaded={setGCodeLoaded}
                gCodeLoaded={gCodeLoaded}
            />
        </div>
    )
}

export default Tablet