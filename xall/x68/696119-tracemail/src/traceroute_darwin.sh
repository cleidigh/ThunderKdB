
HOST=$1
OUTPUT=$2

/usr/sbin/traceroute -m10 $HOST > $OUTPUT
