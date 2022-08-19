/*
 tabletTerminal.js - ESP3D WebUI component file

 Copyright (c) 2021 Luc LEBOSSE. All rights reserved.
 Modified from Terminal.js 

 This code is free software; you can redistribute it and/or
 modify it under the terms of the GNU Lesser General Public
 License as published by the Free Software Foundation; either
 version 2.1 of the License, or (at your option) any later version.
 This code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 Lesser General Public License for more details.
 You should have received a copy of the GNU Lesser General Public
 License along with This code; if not, write to the Free Software
 Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

import { h } from "preact"
import { useEffect, useRef, useState } from "preact/hooks"
import { T } from "../../components/Translations"
import {

    CheckCircle,
    Circle,
    PauseCircle,
} from "preact-feather"
import { useUiContext, useDatasContext, useUiContextFn } from "../../contexts"

const TabletTerminal = () => {
    const { uisettings } = useUiContext()
    const { terminal } = useDatasContext()
    if (terminal.isVerbose.current == undefined)
        terminal.isVerbose.current = uisettings.getValue("verbose")
    if (terminal.isAutoScroll.current == undefined)
        terminal.isAutoScroll.current = uisettings.getValue("autoscroll")
    const [isVerbose, setIsVerbose] = useState(terminal.isVerbose.current)
    const [isAutoScroll, setIsAutoScroll] = useState(
        terminal.isAutoScroll.current
    )
    const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false)
    let lastPos = 0
    const messagesEndRef = useRef(null)
    const terminalOutput = useRef(null)
    const id = "terminalPanel"
    const scrollToBottom = () => {
        if (
            terminal.isAutoScroll.current &&
            !terminal.isAutoScrollPaused.current
        ) {
            terminalOutput.current.scrollTop =
                terminalOutput.current.scrollHeight
        }
    }
    
    useEffect(() => {
        scrollToBottom()
    }, [terminal.content])

    const toggleVerboseMode = () => {
        useUiContextFn.haptic()
        terminal.isVerbose.current = !isVerbose
        setIsVerbose(!isVerbose)
    }

    const toggleAutoScroll = () => {
        useUiContextFn.haptic()
        if (!isAutoScrollPaused) {
            terminal.isAutoScroll.current = !isAutoScroll
            setIsAutoScroll(!isAutoScroll)
        }
        terminal.isAutoScrollPaused.current = false
        setIsAutoScrollPaused(false)
        scrollToBottom()
    }

    const menu = [
        {
            label: T("S76"),
            displayToggle: () => (
                <span class="feather-icon-container">
                    {" "}
                    {isVerbose ? (
                        <CheckCircle size="0.8rem" />
                    ) : (
                        <Circle size="0.8rem" />
                    )}{" "}
                </span>
            ),
            onClick: toggleVerboseMode,
        },
        {
            label: T("S77"),
            displayToggle: () => (
                <span class="feather-icon-container">
                    {isAutoScroll ? (
                        isAutoScrollPaused ? (
                            <PauseCircle size="0.8rem" />
                        ) : (
                            <CheckCircle size="0.8rem" />
                        )
                    ) : (
                        <Circle size="0.8rem" />
                    )}
                </span>
            ),
            onClick: toggleAutoScroll,
        },
        {
            label: T("S79"),
            onClick: (e) => {
                useUiContextFn.haptic()
                terminal.clear()
            },
            icon: <span class="btn btn-clear" aria-label="Close" />,
        },
    ]

    return (
        <div class=""
        style={{
            height: '150px',
            border: '0.05rem solid #dadee4',
            borderRadius: '0.2rem',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/*<ul>
                {menu &&
                    menu.map((item, i) => (
                            <li key={i} style={{display: 'inline-block'}}>
                                <div onclick={item.onClick}>
                                    <div>
                                        <span>
                                            {item.label}
                                        </span>
                                        {item.displayToggle
                                            ? item.displayToggle()
                                            : item.icon}
                                    </div>
                                </div>
                            </li>
                        )
                    )}
            </ul>*/}

            <div
                ref={terminalOutput}
                class="terminal"
                style={{flex: '1 1 auto'}}
                onScroll={(e) => {
                    if (
                        lastPos > e.target.scrollTop &&
                        terminal.isAutoScroll.current
                    ) {
                        terminal.isAutoScrollPaused.current = true
                        setIsAutoScrollPaused(true)
                    }
                    if (
                        terminal.isAutoScrollPaused.current &&
                        Math.abs(
                            e.target.scrollTop +
                                e.target.offsetHeight -
                                e.target.scrollHeight
                        ) < 5
                    ) {
                        terminal.isAutoScrollPaused.current = false
                        setIsAutoScrollPaused(false)
                    }
                    lastPos = e.target.scrollTop
                }}
            >
                {terminal.content &&
                    terminal.content.map((line) => {
                        let className = ""
                        switch (line.type) {
                            case "echo":
                                className = "echo"
                                break
                            case "error":
                                className = "error"
                                break
                            default:
                            //do nothing
                        }
                        if (isVerbose || isVerbose == line.isverboseOnly)
                            return <pre class={className}>{line.content}</pre>
                    })}
                <div ref={messagesEndRef} />
            </div>
        </div>
    )
}


export default TabletTerminal;
